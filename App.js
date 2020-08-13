
import React, { Component } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
  Button,
  ScrollView,
  DeviceEventEmitter,
  NativeEventEmitter,
  Switch,
  TouchableOpacity,
  Dimensions,
  ToastAndroid
} from 'react-native';
import { BluetoothEscposPrinter, BluetoothManager, BluetoothTscPrinter } from "react-native-bluetooth-escpos-printer";
import moment from 'moment';


var { height, width } = Dimensions.get('window');
export default class Home extends Component {


  _listeners = [];

  constructor(props) {
    super(props);
    this.state = {
      devices: null,
      pairedDs: [],
      foundDs: [],
      bleOpend: false,
      loading: true,
      boundAddress: '',
      debugMsg: ''
    }
  }

  componentDidMount() {//alert(BluetoothManager)
    BluetoothManager.isBluetoothEnabled().then((enabled) => {
      this.setState({
        bleOpend: Boolean(enabled),
        loading: false
      })
    }, (err) => {
      err
    });

    if (Platform.OS === 'ios') {
      let bluetoothManagerEmitter = new NativeEventEmitter(BluetoothManager);
      this._listeners.push(bluetoothManagerEmitter.addListener(BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED,
        (rsp) => {
          this._deviceAlreadPaired(rsp)
        }));
      this._listeners.push(bluetoothManagerEmitter.addListener(BluetoothManager.EVENT_DEVICE_FOUND, (rsp) => {
        this._deviceFoundEvent(rsp)
      }));
      this._listeners.push(bluetoothManagerEmitter.addListener(BluetoothManager.EVENT_CONNECTION_LOST, () => {
        this.setState({
          name: '',
          boundAddress: ''
        });
      }));
    } else if (Platform.OS === 'android') {
      this._listeners.push(DeviceEventEmitter.addListener(
        BluetoothManager.EVENT_DEVICE_ALREADY_PAIRED, (rsp) => {
          this._deviceAlreadPaired(rsp)
        }));
      this._listeners.push(DeviceEventEmitter.addListener(
        BluetoothManager.EVENT_DEVICE_FOUND, (rsp) => {
          this._deviceFoundEvent(rsp)
        }));
      this._listeners.push(DeviceEventEmitter.addListener(
        BluetoothManager.EVENT_CONNECTION_LOST, () => {
          this.setState({
            name: '',
            boundAddress: ''
          });
        }
      ));
      this._listeners.push(DeviceEventEmitter.addListener(
        BluetoothManager.EVENT_BLUETOOTH_NOT_SUPPORT, () => {
          ToastAndroid.show("Device Not Support Bluetooth !", ToastAndroid.LONG);
        }
      ))
    }
  }

  componentWillUnmount() {
    //for (let ls in this._listeners) {
    //    this._listeners[ls].remove();
    //}
  }

  _deviceAlreadPaired(rsp) {
    var ds = null;
    if (typeof (rsp.devices) == 'object') {
      ds = rsp.devices;
    } else {
      try {
        ds = JSON.parse(rsp.devices);
      } catch (e) {
      }
    }
    if (ds && ds.length) {
      let pared = this.state.pairedDs;
      pared = pared.concat(ds || []);
      this.setState({
        pairedDs: pared
      });
    }
  }

  _deviceFoundEvent(rsp) {//alert(JSON.stringify(rsp))
    var r = null;
    try {
      if (typeof (rsp.device) == "object") {
        r = rsp.device;
      } else {
        r = JSON.parse(rsp.device);
      }
    } catch (e) {//alert(e.message);
      //ignore
    }
    //alert('f')
    if (r) {
      let found = this.state.foundDs || [];
      if (found.findIndex) {
        let duplicated = found.findIndex(function (x) {
          return x.address == r.address
        });
        //CHECK DEPLICATED HERE...
        if (duplicated == -1) {
          found.push(r);
          this.setState({
            foundDs: found
          });
        }
      }
    }
  }

  _renderRow(rows) {
    let items = [];
    for (let i in rows) {
      let row = rows[i];
      if (row.address) {
        items.push(
          <TouchableOpacity key={new Date().getTime() + i} style={styles.wtf} onPress={() => {
            this.setState({
              loading: true
            });
            BluetoothManager.connect(row.address)
              .then((s) => {
                this.setState({
                  loading: false,
                  boundAddress: row.address,
                  name: row.name || "UNKNOWN"
                })
              }, (e) => {
                this.setState({
                  loading: false
                })
                alert(e);
              })

          }}><Text style={styles.name}>{row.name || "UNKNOWN"}</Text><Text
            style={styles.address}>{row.address}</Text></TouchableOpacity>
        );
      }
    }
    return items;
  }

  render() {
    return (
      <ScrollView style={styles.container}>
        <Text>{this.state.debugMsg}</Text>
        <Text>{JSON.stringify(this.state, null, 3)}</Text>
        <Text style={styles.title}>Blutooth Opended:{this.state.bleOpend ? "true" : "false"} <Text>Open BLE Before Scanning</Text> </Text>
        <View>
          <Switch value={this.state.bleOpend} onValueChange={(v) => {
            this.setState({
              loading: true
            })
            if (!v) {
              BluetoothManager.disableBluetooth().then(() => {
                this.setState({
                  bleOpend: false,
                  loading: false,
                  foundDs: [],
                  pairedDs: []
                });
              }, (err) => { alert(err) });

            } else {
              BluetoothManager.enableBluetooth().then((r) => {
                var paired = [];
                if (r && r.length > 0) {
                  for (var i = 0; i < r.length; i++) {
                    try {
                      paired.push(JSON.parse(r[i]));
                    } catch (e) {
                      //ignore
                    }
                  }
                }
                this.setState({
                  bleOpend: true,
                  loading: false,
                  pairedDs: paired
                })
              }, (err) => {
                this.setState({
                  loading: false
                })
                alert(err)
              });
            }
          }} />
          <Button disabled={this.state.loading || !this.state.bleOpend} onPress={() => {
            this._scan();
          }} title="Scan" />
        </View>
        <Text style={styles.title}>Connected:<Text style={{ color: "blue" }}>{!this.state.name ? 'No Devices' : this.state.name}</Text></Text>
        <Text style={styles.title}>Found(tap to connect):</Text>
        {this.state.loading ? (<ActivityIndicator animating={true} />) : null}
        <View style={{ flex: 1, flexDirection: "column" }}>
          {
            this._renderRow(this.state.foundDs)
          }
        </View>
        <Text style={styles.title}>Paired:</Text>
        {this.state.loading ? (<ActivityIndicator animating={true} />) : null}
        <View style={{ flex: 1, flexDirection: "column" }}>
          {
            this._renderRow(this.state.pairedDs)
          }
          {/* <Text>{' '}</Text>
          <Button onPress={async () => {
            await BluetoothEscposPrinter.printBarCode("123456789012", BluetoothEscposPrinter.BARCODETYPE.JAN13, 3, 120, 0, 2);
            await BluetoothEscposPrinter.printText("\r\n\r\n\r\n", {});
          }} title="Print BarCode" /> */}
        </View>
        <Text>{' '}</Text>
        {/* <Button onPress={async () => {
          await BluetoothEscposPrinter.printerLeftSpace(0);
          await BluetoothEscposPrinter.printColumn([BluetoothEscposPrinter.width58 / 8 / 3, BluetoothEscposPrinter.width58 / 8 / 3 - 1, BluetoothEscposPrinter.width58 / 8 / 3 - 1],
            [BluetoothEscposPrinter.ALIGN.CENTER, BluetoothEscposPrinter.ALIGN.CENTER, BluetoothEscposPrinter.ALIGN.CENTER],
            ["我就是一个测试看看很长会怎么样的啦", 'testing', '223344'], { fonttype: 1 });
          await BluetoothEscposPrinter.printText("\r\n\r\n\r\n", {});
        }} title="Print Column" /> */}

        <Text>{' '}</Text>
        <Button disabled={this.state.loading || this.state.boundAddress.length <= 0}
          title="Print Receipt" onPress={async () => {
            try {
              await BluetoothEscposPrinter.printerInit();
              await BluetoothEscposPrinter.printerLeftSpace(0);

              await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
              await BluetoothEscposPrinter.setBlob(0);
              await BluetoothEscposPrinter.printText("Test1\r\n", {
                encoding: 'GBK',
                codepage: 0,
                widthtimes: 3,
                heigthtimes: 3,
                fonttype: 1
              });
              await BluetoothEscposPrinter.setBlob(0);
              await BluetoothEscposPrinter.printText("Test2\r\n", {
                encoding: 'GBK',
                codepage: 0,
                widthtimes: 0,
                heigthtimes: 0,
                fonttype: 1
              });
              await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
              await BluetoothEscposPrinter.printText("item1：item1\r\n", {});
              await BluetoothEscposPrinter.printText("item2：xsd201909210000001\r\n", {});
              await BluetoothEscposPrinter.printText("Date：" + (moment(new Date(), "yyyy-mm-dd h:MM:ss")) + "\r\n", {});
              await BluetoothEscposPrinter.printText("Serial No.：18664896621\r\n", {});
              await BluetoothEscposPrinter.printText("--------------------------------\r\n", {});
              let columnWidths = [12, 6, 6, 8];
              await BluetoothEscposPrinter.printColumn(columnWidths,
                [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.CENTER, BluetoothEscposPrinter.ALIGN.CENTER, BluetoothEscposPrinter.ALIGN.RIGHT],
                ["Item", 'Quantity', 'Unit Price', 'Amount'], {});
              await BluetoothEscposPrinter.printColumn(columnWidths,
                [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.CENTER, BluetoothEscposPrinter.ALIGN.RIGHT],
                ["Native custom development I am a relatively long position, you can see if it is like this?", '1', '32000', '32000'], {});
              await BluetoothEscposPrinter.printText("\r\n", {});
              await BluetoothEscposPrinter.printColumn(columnWidths,
                [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.CENTER, BluetoothEscposPrinter.ALIGN.RIGHT],
                ["Native custom development I am a relatively long position, you can see if it is like this?", '1', '32000', '32000'], {});
              await BluetoothEscposPrinter.printText("\r\n", {});
              await BluetoothEscposPrinter.printText("--------------------------------\r\n", {});
              await BluetoothEscposPrinter.printColumn([12, 8, 12],
                [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT],
                ["Total", '2', '64000'], {});
              await BluetoothEscposPrinter.printText("\r\n", {});
              await BluetoothEscposPrinter.printText("Discount rate：100%\r\n", {});
              // await BluetoothEscposPrinter.printText("Receivable after discount：64000.00\r\n", {});
              await BluetoothEscposPrinter.printText("Payment amount：64000.00\r\n", {});
              await BluetoothEscposPrinter.printText("Settlement account: cash account\r\n", {});
              await BluetoothEscposPrinter.printText("Remarks: none\r\n", {});
              await BluetoothEscposPrinter.printText("Print Time: " + (moment(new Date(), "yyyy-mm-dd h:MM:ss")) + "\r\n", {});
              await BluetoothEscposPrinter.printText("--------------------------------\r\n", {});
              await BluetoothEscposPrinter.printText("phone: 09162476596\r\n", {});
              await BluetoothEscposPrinter.printText("address:  Civic Drive, Alabang, Muntinlupa, Metro Manila\r\n\r\n", {});
              await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
              await BluetoothEscposPrinter.printText("Welcome next time\r\n\r\n\r\n", {});
              await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
              await BluetoothEscposPrinter.printText("\r\n\r\n\r\n", {});
            } catch (e) {
              alert(e.message || "ERROR");
            }

          }} />

        {/* <View style={{flexDirection:"row",justifyContent:"space-around",paddingVertical:30}}>
                <Button disabled={this.state.loading || !(this.state.bleOpend && this.state.boundAddress.length > 0 )}
                        title="ESC/POS" onPress={()=>{
                    this.props.navigator.push({
                        component:EscPos,
                        passProps:{
                            name:this.state.name,
                            boundAddress:this.state.boundAddress
                        }
                    })
                }}/>
                <Button disabled={this.state.loading|| !(this.state.bleOpend && this.state.boundAddress.length > 0) }
                        title="TSC" onPress={()=>{
                   this.props.navigator.push({
                       component:Tsc,
                       passProps:{
                           name:this.state.name,
                           boundAddress:this.state.boundAddress
                       }
                   })
                }
                }/>
                </View> */}
      </ScrollView>
    );
  }

  // _selfTest() {
  //     this.setState({
  //         loading: true
  //     }, ()=> {
  //         BluetoothEscposPrinter.selfTest(()=> {
  //         });

  //         this.setState({
  //             loading: false
  //         })
  //     })
  // }

  _scan() {
    this.setState({
      loading: true
    })
    BluetoothManager.scanDevices()
      .then((s) => {
        var ss = s;
        var found = ss.found;
        try {
          found = JSON.parse(found);//@FIX_it: the parse action too weired..
        } catch (e) {
          //ignore
        }
        var fds = this.state.foundDs;
        if (found && found.length) {
          fds = found;
        }
        this.setState({
          foundDs: fds,
          loading: false
        });
      }, (er) => {
        this.setState({
          loading: false
        })
        console.log('error' + JSON.stringify(er))
        alert('error' + JSON.stringify(er));
      });
  }


}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5FCFF',
  },

  title: {
    width: width,
    backgroundColor: "#eee",
    color: "#232323",
    paddingLeft: 8,
    paddingVertical: 4,
    textAlign: "left"
  },
  wtf: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  name: {
    flex: 1,
    textAlign: "left"
  },
  address: {
    flex: 1,
    textAlign: "right"
  }
});