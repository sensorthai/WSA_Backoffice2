import fs from 'fs'
import path from 'path'
import os from 'os'
import readline from 'readline'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'

// 1. Parse .env.local manually
const envPath = path.resolve('.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split(/\r?\n/).forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
      if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1)
      process.env[key] = value
    }
  })
}

// 2. Configuration
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (supabaseUrl && supabaseUrl.includes('/rest/v1/')) {
  supabaseUrl = supabaseUrl.split('/rest/v1/')[0]
}
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const SESSION_FILE = path.resolve('scripts/flowaccount-session.json')
const TEMP_DIR = path.join(os.tmpdir(), 'wsa-flowaccount-receipts')
const BUSINESS_ID = process.env.FLOWACCOUNT_BUSINESS_ID || 'N392466'
const expenseUrl = `https://advance.flowaccount.com/${BUSINESS_ID}/business/expenses/new`

// Command-line arguments
const args = process.argv.slice(2)
const isCommit = args.includes('--commit') // Actual save
const isHeaded = !args.includes('--headless') // Show browser window by default

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env.local')
  process.exit(1)
}

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true })
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 3. Helpers
const askEnter = (message) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  rl.question(message, () => {
    rl.close()
    resolve()
  })
})

const getReceiptUrls = (receiptUrl) => {
  if (!receiptUrl) return []
  const trimmed = receiptUrl.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed)
    } catch {
      return [receiptUrl]
    }
  }
  return [receiptUrl]
}

async function downloadFile(url, destPath) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download file from ${url}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  fs.writeFileSync(destPath, buffer)
  return destPath
}

// 4. Main Process
async function main() {
  console.log('=== WSA Backoffice to FlowAccount Expense Sync ===')
  console.log(`Mode: ${isCommit ? '🔴 COMMIT (Will Save Documents)' : '🟡 DRY RUN (Will Not Click Final Save)'}`)
  console.log(`Browser: ${isHeaded ? 'Headed' : 'Headless'}\n`)

  // Step 4.1: Fetch Pending Purchase Requests
  console.log('1. Querying Supabase database...')
  let purchases = []
  let pError = null
  
  const pResult = await supabase
    .from('purchase_requests')
    .select('*, users!purchase_requests_user_id_fkey(full_name, email)')
    .eq('status', 'approved')
    .is('flowaccount_doc_number', null)

  if (pResult.error && pResult.error.message.includes('column') && pResult.error.message.includes('flowaccount_doc_number')) {
    console.log('⚠️  Database column "flowaccount_doc_number" is missing in purchase_requests.')
    console.log('   Falling back to querying all approved purchase requests (no status sync)...')
    const fallbackResult = await supabase
      .from('purchase_requests')
      .select('*, users!purchase_requests_user_id_fkey(full_name, email)')
      .eq('status', 'approved')
    if (fallbackResult.error) {
      pError = fallbackResult.error
    } else {
      purchases = fallbackResult.data || []
    }
  } else if (pResult.error) {
    pError = pResult.error
  } else {
    purchases = pResult.data || []
  }

  if (pError) {
    console.error('❌ Error fetching purchase requests:', pError.message)
    process.exit(1)
  }

  // Fetch Pending Reimbursements
  let reimbursements = []
  let rError = null

  const rResult = await supabase
    .from('reimbursements')
    .select('*, users!user_id(full_name, email)')
    .eq('status', 'approved')
    .is('flowaccount_doc_number', null)

  if (rResult.error && rResult.error.message.includes('column') && rResult.error.message.includes('flowaccount_doc_number')) {
    console.log('⚠️  Database column "flowaccount_doc_number" is missing in reimbursements.')
    console.log('   Falling back to querying all approved reimbursements (no status sync)...')
    const fallbackResult = await supabase
      .from('reimbursements')
      .select('*, users!user_id(full_name, email)')
      .eq('status', 'approved')
    if (fallbackResult.error) {
      rError = fallbackResult.error
    } else {
      reimbursements = fallbackResult.data || []
    }
  } else if (rResult.error) {
    rError = rResult.error
  } else {
    reimbursements = rResult.data || []
  }

  if (rError) {
    console.error('❌ Error fetching reimbursements:', rError.message)
    process.exit(1)
  }

  const pendingItems = []
  
  // Format Purchases for FlowAccount
  purchases.forEach(p => {
    pendingItems.push({
      type: 'purchase',
      id: p.id,
      title: p.title,
      vendor: p.vendor_name || p.users?.full_name || 'พนักงานเบิกจ่าย',
      date: p.document_date || p.created_at.split('T')[0],
      refNo: `PR-${p.id.substring(0, 8)}`,
      purpose: p.purpose || p.title,
      amount: p.total_amount,
      vat: p.vat_amount || 0,
      receiptUrl: p.receipt_url,
      items: p.items || []
    })
  })

  // Format Reimbursements for FlowAccount
  reimbursements.forEach(r => {
    pendingItems.push({
      type: 'reimbursement',
      id: r.id,
      title: r.description,
      vendor: r.users?.full_name || 'พนักงานเบิกจ่าย',
      date: r.expense_date || r.created_at.split('T')[0],
      refNo: `RE-${r.id.substring(0, 8)}`,
      purpose: r.description,
      amount: r.amount,
      vat: 0,
      receiptUrl: r.receipt_url,
      items: [{ name: r.description, quantity: 1, unit_price: r.amount }]
    })
  })

  console.log(`Found ${pendingItems.length} approved expenses pending sync.`)
  if (pendingItems.length === 0) {
    console.log('✅ Nothing to sync. Exiting.')
    process.exit(0)
  }

  // Step 4.2: Session Login check
  let browser, context
  
  if (!fs.existsSync(SESSION_FILE)) {
    console.log('\n🔑 Session file not found. Let\'s perform initial login.')
    console.log('Opening browser in headed mode for manual login...')
    
    browser = await chromium.launch({ headless: false })
    context = await browser.newContext()
    const page = await context.newPage()
    
    await page.goto('https://auth.flowaccount.com/en/login')
    
    console.log('\n👉 ACTION REQUIRED: Please log in manually on the opened browser window.')
    console.log('Once you have completed logging in and are on the FlowAccount Dashboard,')
    await askEnter('Press [ENTER] in this terminal to save the session state...')
    
    // Save storage state (cookies, local storage)
    await context.storageState({ path: SESSION_FILE })
    console.log(`✅ Session state saved to ${SESSION_FILE}`)
    
    await browser.close()
    console.log('Please run the script again to start the sync process.')
    process.exit(0)
  }

  // Step 4.3: Syncing Items
  console.log('\n🚀 Starting automation process...')
  browser = await chromium.launch({ headless: !isHeaded })
  context = await browser.newContext({
    storageState: SESSION_FILE,
    viewport: { width: 1280, height: 800 }
  })
  
  const page = await context.newPage()

  console.log(`   Expense Creation URL: ${expenseUrl}\n`)
  
  for (let i = 0; i < pendingItems.length; i++) {
    const item = pendingItems[i]
    console.log(`\n[${i + 1}/${pendingItems.length}] Syncing: ${item.refNo} - "${item.title}" (${item.amount} THB)`)
    
    try {
      // 1. Download receipt file if available
      let localReceiptPath = null
      const receiptUrls = getReceiptUrls(item.receiptUrl)
      
      if (receiptUrls.length > 0 && receiptUrls[0].startsWith('http')) {
        const url = receiptUrls[0]
        const ext = path.extname(url).split('?')[0] || '.png'
        localReceiptPath = path.join(TEMP_DIR, `${item.refNo}${ext}`)
        console.log(`   Downloading receipt: ${url.substring(0, 50)}...`)
        await downloadFile(url, localReceiptPath)
        console.log(`   Saved locally: ${localReceiptPath}`)
      }

      // 2. Navigate to FlowAccount create expense page
      console.log(`   Navigating to: ${expenseUrl}`)
      await page.goto(expenseUrl)
      
      // Check if logged in (in case session expired)
      if (page.url().includes('auth.flowaccount.com')) {
        console.error('❌ Session expired. Please delete scripts/flowaccount-session.json and run the script again to log in.')
        await browser.close()
        process.exit(1)
      }

      // 3. Fill Supplier/Vendor
      console.log(`   Filling Vendor: "${item.vendor}"`)
      // Locate the supplier contact combobox/input (supporting Classic and Advance)
      const supplierSelector = 'input[placeholder*="Supplier"], input[placeholder*="ผู้ติดต่อ"], input[placeholder*="ค้นหาผู้ติดต่อ"], input[placeholder*="เลือกผู้จำหน่าย"]'
      await page.waitForSelector(supplierSelector)
      await page.click(supplierSelector)
      await page.fill(supplierSelector, item.vendor)
      await page.keyboard.press('Enter')
      await page.waitForTimeout(1000)

      // 4. Fill Document Date
      console.log(`   Filling Date: ${item.date}`)
      // For Advance, we target the first visible date format input (dd-mm-yyyy) or default to standard date input
      const dateSelector = 'input[type="date"], input[placeholder*="Date"], input[placeholder*="วันที่"]'
      let dateInput = page.locator(dateSelector).first()
      if (!(await dateInput.isVisible())) {
        // Fallback for Advance: the first input that has value matching dd-mm-yyyy format
        dateInput = page.locator('input').filter({ hasValue: /^\d{2}-\d{2}-\d{4}$/ }).first()
      }
      if (await dateInput.isVisible()) {
        // WSA Backoffice date is YYYY-MM-DD. FlowAccount Advance expects DD-MM-YYYY.
        let formattedDate = item.date
        if (item.date.includes('-') && item.date.split('-')[0].length === 4) {
          const [yyyy, mm, dd] = item.date.split('-')
          formattedDate = `${dd}-${mm}-${yyyy}`
        }
        await dateInput.click()
        await page.keyboard.press('Control+A')
        await page.keyboard.press('Backspace')
        await dateInput.fill(formattedDate)
        await page.keyboard.press('Enter')
      }

      // 5. Fill Reference Number
      console.log(`   Filling Reference No: ${item.refNo}`)
      const refSelector = 'input.reference, input[placeholder*="Ref"], input[placeholder*="อ้างอิง"]'
      const refInput = page.locator(refSelector).first()
      if (await refInput.isVisible()) {
        await refInput.fill(item.refNo)
      }

      // 6. Fill Itemized Details
      console.log('   Filling Item lines...')
      for (let j = 0; j < item.items.length; j++) {
        const lineItem = item.items[j]
        const lineDesc = lineItem.name || lineItem.description || item.title
        const lineQty = Number(lineItem.quantity || 1)
        const linePrice = Number(lineItem.unit_price || lineItem.price || item.amount)

        console.log(`     Line ${j+1}: ${lineDesc} (x${lineQty}) - ${linePrice} THB`)

        // Fill item descriptions (Advance uses textarea for description!)
        const descSelector = `textarea[placeholder*="รายละเอียด"], input[placeholder*="Description"], input[placeholder*="รายละเอียด"]`
        const descInputs = page.locator(descSelector)
        if (j > 0) {
          // Click "Add Row" button if multiple items
          const addRowButton = page.locator('button:has-text("Add Row"), button:has-text("เพิ่มแถว"), button:has-text("เพิ่มรายการ")').first()
          if (await addRowButton.isVisible()) {
            await addRowButton.click()
            await page.waitForTimeout(500)
          }
        }
        
        await descInputs.nth(j).fill(lineDesc)
        
        // Quantity and Unit Price fields
        // Advance uses input.text-right for both qty and price (qty is 1st in row, price is 2nd in row)
        const textRightInputs = page.locator('input.text-right')
        const qtyInputs = page.locator('input[type="number"][placeholder*="Qty"], input[placeholder*="จำนวน"]')
        const priceInputs = page.locator('input[type="number"][placeholder*="Price"], input[placeholder*="ราคา"], input[placeholder*="หน่วย"]')
        
        if (await textRightInputs.first().isVisible()) {
          const qtyInput = textRightInputs.nth(j * 2)
          const priceInput = textRightInputs.nth(j * 2 + 1)
          
          await qtyInput.click()
          await page.keyboard.press('Control+A')
          await qtyInput.fill(lineQty.toString())
          
          await priceInput.click()
          await page.keyboard.press('Control+A')
          await priceInput.fill(linePrice.toString())
        } else {
          // Classic format
          if (await qtyInputs.nth(j).isVisible()) {
            await qtyInputs.nth(j).fill(lineQty.toString())
          }
          if (await priceInputs.nth(j).isVisible()) {
            await priceInputs.nth(j).fill(linePrice.toString())
          }
        }
      }

      // 7. Handle VAT if present
      if (item.vat > 0) {
        console.log(`   Setting VAT: ${item.vat} THB`)
        const vatCheckbox = page.locator('input#isVat, input[name*="isVat"]').first()
        if (await vatCheckbox.isVisible()) {
          const isChecked = await vatCheckbox.isChecked()
          if (!isChecked) {
            await vatCheckbox.click()
          }
          const vatInput = page.locator('input#vat-amount-input, input[id*="vat-amount"]').first()
          if (await vatInput.isVisible()) {
            await vatInput.click()
            await page.keyboard.press('Control+A')
            await vatInput.fill(item.vat.toString())
          }
        } else {
          // Classic select fallback
          const vatDropdown = page.locator('select[name*="vat"], button[id*="vat"]').first()
          if (await vatDropdown.isVisible()) {
            await vatDropdown.selectOption('7')
          }
        }
      }

      // 8. Upload Receipt
      if (localReceiptPath) {
        console.log('   Uploading receipt file...')
        const fileInputSelector = 'input[type="file"], input.upload-file-input'
        const fileInput = page.locator(fileInputSelector).first()
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(localReceiptPath)
          await page.waitForTimeout(2000)
          console.log('   Upload complete.')
        } else {
          console.log('   ⚠️ File input element not found. Skipping file upload.')
        }
      }

      // 9. Save and Confirm
      if (isCommit) {
        console.log('   🔴 Saving document in FlowAccount...')
        const saveButton = page.locator('button:has-text("Save"), button:has-text("บันทึก"), button[type="submit"]').first()
        await saveButton.click()
        
        // Wait for page redirect or success alert
        await page.waitForNavigation({ timeout: 10000 }).catch(() => {})
        await page.waitForTimeout(2000)

        // Try to capture Document Number from URL or elements
        // E.g. https://app.flowaccount.com/expense/view/EX2026060001
        let docNumber = 'EX-AUTO-' + Date.now().toString().slice(-6)
        const currentUrl = page.url()
        const match = currentUrl.match(/view\/(EX\d+)/)
        if (match) {
          docNumber = match[1]
        }
        console.log(`   ✅ Saved successfully! FlowAccount Doc No: ${docNumber}`)

        // 10. Update Supabase
        console.log('   Updating WSA Backoffice database...')
        const targetTable = item.type === 'purchase' ? 'purchase_requests' : 'reimbursements'
        const { error: updateError } = await supabase
          .from(targetTable)
          .update({
            flowaccount_doc_number: docNumber,
            flowaccount_synced_at: new Date().toISOString()
          })
          .eq('id', item.id)

        if (updateError) {
          console.error(`   ⚠️ Failed to update database status for ${item.refNo}:`, updateError.message)
        } else {
          console.log(`   ✅ Database status updated for ${item.refNo}`)
        }
      } else {
        console.log('   🟡 Dry Run: Form filled successfully. Final save skipped.')
        await page.waitForTimeout(3000) // Pause so user can inspect form if headed
      }

      // Clean up local temp file
      if (localReceiptPath && fs.existsSync(localReceiptPath)) {
        fs.unlinkSync(localReceiptPath)
      }

    } catch (err) {
      console.error(`   ❌ Failed to sync ${item.refNo}:`, err.message)
      try {
        await page.screenshot({ path: 'scripts/error-screenshot.png' })
        console.log('   📸 Saved error screenshot to scripts/error-screenshot.png')
      } catch (screenshotErr) {
        console.error('   Failed to capture screenshot:', screenshotErr.message)
      }
    }
  }

  console.log('\n🎉 Automation process completed.')
  await browser.close()
}

main().catch(console.error)
