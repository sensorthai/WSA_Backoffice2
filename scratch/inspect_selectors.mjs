import fs from 'fs'
import path from 'path'
import { chromium } from 'playwright'

const SESSION_FILE = path.resolve('scripts/flowaccount-session.json')

async function run() {
  if (!fs.existsSync(SESSION_FILE)) {
    console.error('Session file not found.')
    process.exit(1)
  }

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ storageState: SESSION_FILE })
  const page = await context.newPage()

  console.log('Navigating to advance.flowaccount.com to trigger redirect...')
  const expenseUrl = `https://advance.flowaccount.com/N392466/business/expenses/new`
  console.log('Navigating directly to expense creation URL:', expenseUrl)
  await page.goto(expenseUrl)
  await page.waitForTimeout(3000)

  console.log('\n--- Inspecting Inputs ---')
  const inputs = await page.evaluate(() => {
    const results = []
    
    // 1. All select tags
    document.querySelectorAll('select').forEach((el, index) => {
      results.push({
        type: 'select',
        index,
        id: el.id,
        name: el.name,
        className: el.className,
        placeholder: el.getAttribute('placeholder'),
        options: Array.from(el.options).map(o => o.text).slice(0, 5)
      })
    })

    // 2. All input tags
    document.querySelectorAll('input').forEach((el, index) => {
      results.push({
        type: 'input',
        index,
        id: el.id,
        name: el.name,
        inputType: el.type,
        className: el.className,
        placeholder: el.getAttribute('placeholder'),
        value: el.value
      })
    })

    // 3. Textareas
    document.querySelectorAll('textarea').forEach((el, index) => {
      results.push({
        type: 'textarea',
        index,
        id: el.id,
        name: el.name,
        className: el.className,
        placeholder: el.getAttribute('placeholder'),
        value: el.value
      })
    })

    return results
  })

  console.log(JSON.stringify(inputs, null, 2))
  await browser.close()
}

run().catch(console.error)
