import React, {useCallback, useEffect, useState} from 'react';
import BleManager, {
  BleDisconnectPeripheralEvent,
  BleManagerDidUpdateValueForCharacteristicEvent,
  BleScanCallbackType,
  BleScanMatchMode,
  BleScanMode,
  Peripheral,
} from 'react-native-ble-manager';
import {
  Button,
  NativeEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

const ALLOW_DUPLICATES = true;
const SECONDS_TO_SCAN_FOR = 30;
const SERVICE_UUIDS: string[] = [];

function App(): JSX.Element {
  const [bluetoothState, setBluetoothState] = useState<string>('off');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [peripherals, setPeripherals] = useState([]);
  const [started, setStarted] = useState<boolean>(false);

  const checkState = useCallback(async () => {
    try {
      const state = await BleManager.checkState();
      setBluetoothState(state);
      console.debug(`BlueTooth State: ${state}`);
    } catch (error) {
      console.error('[BLUETOOTH::CHECK_STATE]', error);
    }
  }, []);

  const enableBluetooth = useCallback(async () => {
    try {
      await BleManager.enableBluetooth();
      console.debug('Bluetooth enabled');
    } catch (error) {
      console.error('[BLUETOOTH::ENABLE]', error);
    }
  }, []);

  const initBluetooth = useCallback(async () => {
    try {
      await BleManager.start({
        // forceLegacy: true,
      });
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

  const onDiscover = useCallback((peripheral: Peripheral) => {
    console.log(peripheral.id, peripheral.name);
    setPeripherals(arr => [
      ...arr.filter(x => x.id !== peripheral.id),
      peripheral,
    ].sort((a, b) => b.id.localeCompare(a.id)));
  }, []);

  const startScan = useCallback(async () => {
    if (!isScanning) {
      setPeripherals([]);
      setIsScanning(true);

      console.debug('BlueTooth scan started');

      try {
        const connected = await BleManager.getConnectedPeripherals(
          SERVICE_UUIDS,
        );
        console.log(connected);
      } catch (error) {
        console.error('[BLUETOOTH::SCAN]', error);
      }

      try {
        console.log(BleScanMode);
        await BleManager.scan(
          SERVICE_UUIDS,
          SECONDS_TO_SCAN_FOR,
          ALLOW_DUPLICATES,
          {
            matchMode: BleScanMatchMode.Aggressive,
            scanMode: BleScanMode.Balanced,
          },
        );
      } catch (error) {
        console.error('[BLUETOOTH::SCAN]', error);
      }
    }
  }, [isScanning]);

  const stopScan = useCallback(() => {
    setIsScanning(false);
    console.debug('BlueTooth scan stopped');
  }, []);

  useEffect(() => {
    const subscriptions = [];
    subscriptions.push(
      bleManagerEmitter.addListener('BleManagerDidUpdateState', args => {
        setBluetoothState(args.state);
      }),
    );
    subscriptions.push(
      bleManagerEmitter.addListener('BleManagerStopScan', stopScan),
    );
    subscriptions.push(
      bleManagerEmitter.addListener('BleManagerDiscoverPeripheral', onDiscover),
    );

    return () => {
      subscriptions.forEach(sub => sub.remove());
    };
  }, [onDiscover, stopScan]);

  if (!started) {
    return (
      <View style={styles.container}>
        <Button onPress={initBluetooth} title="Start" />
      </View>
    );
  }

  if (bluetoothState !== 'on') {
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
      {bluetoothState === 'on' ? null : (
        <View style={styles.row}>
          <Button onPress={enableBluetooth} title="Enable BlueTooth" />
        </View>
      )}
      <View style={styles.row}>
        <Text>BlueTooth State: {bluetoothState}</Text>
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
      <ScrollView>
        {peripherals.map(peripheral => (
          <View key={peripheral.id} style={styles.row}>
            <View>
              <Text style={styles.peripheralName}>
                {peripheral.name || peripheral.localName || ''}
              </Text>
            </View>
            <View>
              <Text style={styles.peripheralId}>
                {peripheral.id}
              </Text>
            </View>
          </View>
        ))}
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
