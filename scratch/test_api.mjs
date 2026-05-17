import fetch from 'node-fetch'

async function testAddDept() {
  const res = await fetch('http://localhost:3001/api/admin/departments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // We can't easily send a session cookie here without logging in first
    },
    body: JSON.stringify({
      name: 'Test Dept from Script',
      org_id: '00000000-0000-0000-0000-000000000001'
    })
  })

  console.log('Status:', res.status)
  const text = await res.text()
  console.log('Body:', text)
}

testAddDept()
