require('dotenv').config();
const app = require('./server');
const request = require('supertest');

const PORT = process.env.PORT || 3000;

// Test the server endpoints
async function testEndpoints() {
  console.log('🧪 Testing Supabase Data Comparison API Endpoints\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthRes = await request(app).get('/health');
    console.log('✅ Health check:', healthRes.status === 200 ? 'PASSED' : 'FAILED');
    
    // Test root endpoint to see available routes
    console.log('\n2. Testing root endpoint...');
    const rootRes = await request(app).get('/');
    console.log('✅ Root endpoint:', rootRes.status === 200 ? 'PASSED' : 'FAILED');
    console.log('Available endpoints:', Object.keys(rootRes.body.endpoints || {}));
    
    console.log('\n📝 API Endpoints Ready:');
    console.log('GET /api/data/data/:table - Fetch data from a Supabase table');
    console.log('POST /api/data/compare - Compare data between two tables');
    console.log('POST /api/data/search - Search for specific records');
    console.log('POST /api/data/compare-advanced - Advanced comparison with multiple criteria');
    
    console.log('\n🔧 Setup Instructions:');
    console.log('1. Create a .env file with your Supabase credentials:');
    console.log('   SUPABASE_URL=your_supabase_project_url');
    console.log('   SUPABASE_ANON_KEY=your_supabase_anon_key');
    console.log('2. Start the server: npm start');
    console.log('3. Use the endpoints to compare your Supabase data');
    
    console.log('\n📖 Example Usage:');
    console.log('GET /api/data/data/users?limit=10');
    console.log('POST /api/data/compare');
    console.log('Body: {');
    console.log('  "table1": "users",');
    console.log('  "table2": "profiles", ');
    console.log('  "compareField": "email"');
    console.log('}');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run tests if this file is executed directly
if (require.main === module) {
  testEndpoints().then(() => {
    console.log('\n✅ Tests completed!');
    process.exit(0);
  }).catch(err => {
    console.error('❌ Tests failed:', err);
    process.exit(1);
  });
}

module.exports = { testEndpoints };