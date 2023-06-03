1. Turn on `BlueTooth tethering` in system settings
2. Pair to the recorder device
3. Run `adb shell ifconfig` to find the network address for `bt-pan` adapter
4. Look up `DHCP` table, or scan port `21` on the `bt-pan` network to find the IP address of the recorder
5. Connect to recorder via `FTP`:
   - port: 21
   - username: btftp
   - password: phone-download
6. Download recorder files
7. Decrypt the file into `wav` file, the code is prepared in `utils/decode.js`
