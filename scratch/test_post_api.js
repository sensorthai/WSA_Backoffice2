
async function testPost() {
  const res = await fetch('http://localhost:3001/api/admin/positions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Manual Test Position ' + Date.now(),
      approval_limit: 1000,
      org_id: '00000000-0000-0000-0000-000000000001'
    })
  })
  console.log('Status:', res.status)
  console.log('Body:', await res.json())
}
testPost()
