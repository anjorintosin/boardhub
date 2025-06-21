const { exec } = require('child_process');
const os = require('os');

const platform = os.platform();

function checkPort(port) {
  console.log(`🔍 Checking what's using port ${port}...`);
  
  let command;
  
  if (platform === 'darwin' || platform === 'linux') {
    // macOS and Linux
    command = `lsof -i :${port}`;
  } else if (platform === 'win32') {
    // Windows
    command = `netstat -ano | findstr :${port}`;
  } else {
    console.log('❌ Unsupported platform');
    return;
  }
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log(`✅ Port ${port} is available`);
      return;
    }
    
    if (stdout) {
      console.log(`❌ Port ${port} is in use by:`);
      console.log(stdout);
      
      if (platform === 'darwin' || platform === 'linux') {
        console.log('\n💡 To kill the process, run:');
        console.log(`   kill -9 <PID>`);
      } else if (platform === 'win32') {
        console.log('\n💡 To kill the process, run:');
        console.log(`   taskkill /PID <PID> /F`);
      }
    } else {
      console.log(`✅ Port ${port} is available`);
    }
  });
}

// Check port 5000
checkPort(5000);

// Also check common alternative ports
setTimeout(() => checkPort(5001), 1000);
setTimeout(() => checkPort(3001), 2000); 