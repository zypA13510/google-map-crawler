'use strict'

const assert = require('assert')
const config = require('config')
const fs = require('fs-extra')
const {chromium} = require('playwright-chromium')
const readline = require('readline')
  .createInterface({
    input: process.stdin,
    output: process.stdout
  })

async function screenshot(page, name) {
  return page.screenshot({path: `output/debug-${name}.png`})
}

;(async function main() {
  let input = config.get('input')
  assert(input instanceof Array && input.every(member => typeof member === 'string'))
  await fs.remove('output/').then(() => fs.mkdir('output/'))
  let browser = await chromium.launch({
    headless: false,
  })
  let context = await browser.newContext()
  await context.newPage()
  for (let url of input) {
    let page = await context.newPage()
    let retry
    do {
      try {
        await page.goto(url, {
          waitUntil: 'networkidle',
        })
        let span = await page.$('.section-editorial-quote>span')
        let text
        if (span) {
          text = await span.innerText()
        } else {
          text = 'Error: span not found'
        }
        console.log(`${url}: ${text}`)
        await Promise.all([
          screenshot(page, url.slice(-6)).then(() => page.close()),
          fs.appendFile('output/output.txt', text + '\n'),
        ])
      } catch (err) {
        console.error(err)
        let answer = await new Promise(resolve => 
          readline.question('Retry? (Y/N)', answer => {
            resolve(answer)
          })
        )
        answer = answer.toUpperCase()
        retry = answer === 'Y' || answer === 'YES'
      }
    } while (retry)
  }
  await browser.close()
  process.exit(0)
})().catch(err => {
  console.error(err)
  process.exit(-1)
})