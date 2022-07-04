import { ethers } from "ethers";
import { Button, InputNumber, Col, Row, Table, Alert } from "antd";
import React, { useEffect, useState, useMemo } from "react";
import * as multicall2Artifact from "../contracts/Multicall2.json";

function Assignment2({ userSigner, localProvider, targetNetwork, setSelectedNetwork }) {
  const [contract, setContract] = useState();
  const [multicallContract, setMulticallContract] = useState();
  const [batchId, setBatchId] = useState(Math.floor(Date.now() / 1000));
  const [reported, setReported] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [inBatch, setInBatch] = useState(false);
  const [weatherData, setWeatherData] = useState();
  const [loadedWeatherData, setLoadedWeatherData] = useState();
  const abi = [
    "function reportWeather(uint32 batchId, bytes32 cityName, uint32 temperature) external",
    "function getWeather(uint32 batchId, bytes32 cityName) public view returns (uint32)",
  ];

  const contractAddress = "0x49354813d8BFCa86f778DfF4120ad80E4D96D74E";
  const multical2ContractAddress = "0x934Ea877487E0ed6B92bf715D7A7EE968B5E7bc9";

  useEffect(() => {
    let providerOrSigner = userSigner ? userSigner : localProvider;
    if (providerOrSigner) {
      setContract(new ethers.Contract(contractAddress, abi, providerOrSigner));
      setMulticallContract(new ethers.Contract(multical2ContractAddress, multicall2Artifact.abi, providerOrSigner));
    }
  }, [userSigner, localProvider]);

  const isRightNetwork = useMemo(() => {
    return targetNetwork.name === "testnet";
  }, [targetNetwork]);

  const isRightProvider = useMemo(() => {
    return contract && contract.signer && targetNetwork.chainId === contract.signer.provider._network.chainId;
  }, [contract, targetNetwork]);

  const switchNetwork = async () => {
    const chainId = ethers.utils.hexStripZeros(ethers.utils.hexlify(targetNetwork.chainId));
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId,
                chainName: `Cronos ${targetNetwork.name}`,
                rpcUrls: [targetNetwork.rpcUrl],
              },
            ],
          });
        } catch (addError) {
          // handle "add" error
        }
      }
      // handle other "switch" errors
    }
  };

  const columns = [
    {
      title: "City",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Temperature(°C)",
      dataIndex: "temp",
      key: "temp",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
    },
  ];

  const cities = [
    {
      name: "Shanghai",
      key: "shanghai",
    },
    {
      name: "Hong Kong",
      key: "hongkong",
    },
    {
      name: "Beijing",
      key: "beijing",
    },
    // {
    //   name: "London",
    //   key: "london",
    // },
  ];

  // 1656701375
  // 1656904195

  const fetchWeatherOfCity = async function (key) {
    const res = await fetch(`https://goweather.herokuapp.com/weather/${key}`).then(res => res.json());
    console.log(res);
    const matched = res.temperature.match(/([+-]?\d+)/);
    return matched ? parseFloat(matched[0]) : 0;
  };

  const fetchWeatherData = async function (reportInBatch = false) {
    const tempResults = await Promise.all(cities.map(({ key }) => fetchWeatherOfCity(key)));
    const data = tempResults.map((temp, i) => {
      return { ...cities[i], temp, status: "processing" };
    });

    setWeatherData(data);
    setInBatch(reportInBatch);
    setFetched(true);
    setReported(false);
  };

  const reportWeatherData = async () => {
    const txs = await Promise.all(
      weatherData.map(({ key, temp }) =>
        contract.reportWeather(batchId, ethers.utils.formatBytes32String(key), Math.round(temp * 1e2)),
      ),
    );

    const txResults = await Promise.all(txs.map(tx => tx.wait()));

    const newWeatherData = txResults.map((txResult, i) => {
      let status = !!txResult.blockHash ? "success" : "failed";
      return { ...weatherData[i], status };
    });

    setWeatherData(newWeatherData);
    setReported(true);
    setFetched(false);
  };

  const reportWeatherDataInBatch = async () => {
    let calls = weatherData.map(({ key, temp }) => ({
      target: contractAddress,
      callData: contract.interface.encodeFunctionData("reportWeather", [
        batchId,
        ethers.utils.formatBytes32String(key),
        Math.round(temp * 1e2),
      ]),
    }));

    const tx = await multicallContract.aggregate(calls);
    const txResult = await tx.wait();

    const newWeatherData = weatherData.map(rec => ({
      ...rec,
      status: txResult.blockHash ? "success" : "failed",
    }));

    setWeatherData(newWeatherData);
    setReported(true);
    setFetched(false);
  };

  useEffect(() => {
    if (fetched) {
      if (inBatch) {
        reportWeatherDataInBatch();
      } else {
        reportWeatherData();
      }
      setInBatch(false);
    }
  }, [fetched]);

  const loadWeatherData = async () => {
    const temps = await Promise.all(
      cities.map(({ key }) => contract.getWeather(batchId, ethers.utils.formatBytes32String(key))),
    );

    console.log("temps: ", temps);
    const data = temps.map((temp, i) => {
      return { ...cities[i], temp: temp / 1e2 };
    });
    setLoadedWeatherData(data);
  };

  const loadWeatherDataInBatch = async () => {
    let calls = cities.map(({ key }) => ({
      target: contractAddress,
      callData: contract.interface.encodeFunctionData("getWeather", [batchId, ethers.utils.formatBytes32String(key)]),
    }));

    const res = await multicallContract.callStatic.aggregate(calls);
    let results = res.returnData.map(result => {
      return contract.interface.decodeFunctionResult("getWeather", result);
    });

    const data = results.map((temp, i) => {
      return { ...cities[i], temp: temp / 1e2 };
    });

    setLoadedWeatherData(data);
  };

  return (
    <div>
      <Row justify="center" style={{ margin: 35 }}>
        <Col span={12}>
          {!isRightNetwork ? (
            <Alert
              message="Wrong network, should be testnet"
              type="warning"
              action={
                <Button size="small" type="primary" onClick={() => setSelectedNetwork("testnet")}>
                  Select Testnet
                </Button>
              }
            />
          ) : !userSigner ? (
            <Alert message="Please connect your wallet first" type="warning" />
          ) : (
            !isRightProvider && (
              <Alert
                message="Wrong network from your provider, please switch it to testnet"
                type="warning"
                action={
                  window.ethereum ? (
                    <Button size="small" type="primary" onClick={switchNetwork}>
                      Switch Network
                    </Button>
                  ) : (
                    ""
                  )
                }
              />
            )
          )}
          <Row align="middle" gutter={15} style={{ padding: 15 }}>
            <Col>Batch ID:</Col>
            <Col flex={1}>
              <InputNumber
                value={batchId}
                onChange={v => {
                  setBatchId(v);
                }}
                style={{ width: "100%" }}
              />
            </Col>
            <Col>
              <Button
                type="primary"
                disabled={!(isRightNetwork && userSigner && isRightProvider)}
                onClick={() => fetchWeatherData()}
              >
                Report Weather
              </Button>
              <Button
                type="primary"
                style={{ marginLeft: 15 }}
                disabled={!(isRightNetwork && userSigner && isRightProvider)}
                onClick={() => fetchWeatherData(true)}
              >
                Batch Report Weather
              </Button>
            </Col>
          </Row>
          <p>Notice: there will be 3 transactions to sign by your wallet, please sign them all. </p>

          <div style={{ marginTop: 50 }}>
            <Table columns={columns} dataSource={weatherData} pagination={false} />
          </div>

          <div style={{ marginTop: 50 }}>
            <Row align="middle" gutter={15} style={{ padding: 15 }}>
              <Col>Batch ID: {batchId}</Col>
              <Col flex={1} style={{ textAlign: "right" }}>
                <Button type="primary" disabled={!isRightNetwork} onClick={() => loadWeatherData()}>
                  Load Weather
                </Button>
                <Button
                  type="primary"
                  disabled={!isRightNetwork}
                  style={{ marginLeft: 15 }}
                  onClick={() => loadWeatherDataInBatch()}
                >
                  Batch Load Weather
                </Button>
              </Col>
            </Row>
            <Table columns={columns.slice(0, -1)} dataSource={loadedWeatherData} pagination={false} />
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default Assignment2;
