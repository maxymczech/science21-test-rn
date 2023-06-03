const {execSync} = require('child_process')
for (let o = 1; o < 255; o++) {
  const cmd = `adb shell ping -c 1 -i 0.25 192.168.44.${o}`;
  console.log(cmd);
  try {
    execSync(cmd, {
      stdio: 'inherit'
    });
  } catch (e) {
    console.log('ERROR');
  }
}
