// Test entry point
console.log('Starting test...');

try {
  console.log('Testing xenova bootstrap...');
  import('./src/bootstrap/xenova-env.js').then(() => {
    console.log('Bootstrap import completed successfully');
  }).catch(error => {
    console.error('Bootstrap failed:', error);
    throw error;
  });
} catch (error) {
  console.error('Test failed:', error);
  throw error;
}