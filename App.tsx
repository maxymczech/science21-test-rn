import React, {useCallback, useEffect, useState} from 'react';
import {
  Button,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RNBluetoothClassic from 'react-native-bluetooth-classic';

function App(): JSX.Element {
  const [bluetoothState, setBluetoothState] = useState<boolean>(false);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [peripherals, setPeripherals] = useState([]);
  const [started, setStarted] = useState<boolean>(false);

  const checkState = useCallback(async () => {
    try {
      const state = await RNBluetoothClassic.isBluetoothEnabled();
      setBluetoothState(state);
      console.debug(`BlueTooth State: ${state}`);
    } catch (error) {
      console.error('[BLUETOOTH::CHECK_STATE]', error);
    }
  }, []);

  const enableBluetooth = useCallback(async () => {
    try {
      await RNBluetoothClassic.requestBluetoothEnabled();
      console.debug('Bluetooth enabled');
    } catch (error) {
      console.error('[BLUETOOTH::ENABLE]', error);
    }
  }, []);

  const getBonded = useCallback(async () => {
    try {
      const result = await RNBluetoothClassic.getBondedDevices();
      const recorder = result.find(x => x.name === 'recorder');
      const isConnected = await recorder.isConnected();
      if (isConnected) {
        console.log('Connected!');
      } else {
        const connection = await recorder.connect({
          CONNECTION_TYPE: 'binary',
        });
        console.log(connection);
      }
    } catch (error) {
      console.error('[BLUETOOTH::GET_BONDED]', error);
    }
  }, []);

  const initBluetooth = useCallback(async () => {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 23) {
          const checkResult = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);
          console.debug('checkResult', checkResult);
        }
        if (Platform.Version >= 31) {
          const checkResult = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          ]);
          console.debug('checkResult', checkResult);
        }
      }
      await checkState();
      setStarted(true);
      console.debug('BlueTooth module started');
    } catch (error) {
      console.error('[BLUETOOTH::INIT]', error);
    }
  }, [checkState]);

  const startScan = useCallback(async () => {
    if (!isScanning) {
      setPeripherals([]);
      setIsScanning(true);

      console.debug('BlueTooth scan started');

      const unpaired = await RNBluetoothClassic.startDiscovery();
      unpaired.sort((a, b) => a.id.localeCompare(b.id));

      setPeripherals(unpaired);
      setIsScanning(false);
      console.debug('BlueTooth scan stopped');
    }
  }, [isScanning]);

  const pairDevice = useCallback(async address => {
    const result = await RNBluetoothClassic.pairDevice(address);
    console.log(result);
  }, []);

  useEffect(() => {
    const subscriptions = [];
    subscriptions.push(
      RNBluetoothClassic.onStateChanged(event => {
        setBluetoothState(event.enabled);
      }),
    );

    return () => {
      subscriptions.forEach(sub => sub.remove());
    };
  }, []);

  if (!started) {
    return (
      <View style={styles.container}>
        <Button onPress={initBluetooth} title="Start" />
      </View>
    );
  }

  if (!bluetoothState) {
    return (
      <View style={styles.container}>
        <View style={styles.row}>
          <Button onPress={enableBluetooth} title="Enable BlueTooth" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.row}>
          <Text>BlueTooth State: {bluetoothState ? 'on' : 'off'}</Text>
        </View>
        <View style={styles.row}>
          <Button
            onPress={startScan}
            title={isScanning ? 'Scanning...' : 'Start Scan'}
          />
        </View>
        <View style={styles.row}>
          <Text>Discovered Peripherals: {peripherals.length}</Text>
        </View>
        {peripherals.map(peripheral => (
          <TouchableOpacity
            key={peripheral.id}
            onPress={() => pairDevice(peripheral.address)}
            style={styles.row}>
            <View>
              <Text style={styles.peripheralName}>
                {peripheral.name || peripheral.localName || ''}
              </Text>
            </View>
            <View>
              <Text style={styles.peripheralId}>{peripheral.id}</Text>
            </View>
            {peripheral.id === peripheral.address ? null : (
              <View>
                <Text style={styles.peripheralId}>
                  Address: {peripheral.address}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        <View style={styles.row}>
          <Button onPress={getBonded} title="Get Bonded Devices" />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
  peripheralId: {
    color: '#cccccc',
    fontSize: 12,
  },
  peripheralName: {
    fontWeight: 'bold',
  },
  row: {
    marginBottom: 10,
  },
});

export default App;
