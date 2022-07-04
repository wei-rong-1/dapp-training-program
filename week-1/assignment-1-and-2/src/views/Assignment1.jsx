import { ethers } from "ethers";
import { Button, Statistic, Col, Row } from "antd";
import React, { useEffect, useState } from "react";

function Assignment1({ userSigner, localProvider, targetNetwork }) {
  const [oracleContract, setOracleContract] = useState();
  const [latestPrice, setLatestPrice] = useState();
  const [intervalHandler, setIntervalHandler] = useState();
  const oracleAbi = [
    'function latestAnswer() external view returns (int256)'
  ]
  const oracleDeployments = {
    'testnet': '0xB3F6eA8161bDc927d96Ae4d4cb35C33c4f3B85b7',
    'mainnet': '0xb3DF0a9582361db08EC100bd5d8CB70fa8579f4B'
  }

  useEffect(() => {
    let provider = userSigner && userSigner.provider ? userSigner.provider : localProvider
    if (provider) {
      setOracleContract(new ethers.Contract(oracleDeployments[targetNetwork.name], oracleAbi, provider))
    }
  }, [userSigner, localProvider, targetNetwork])

  useEffect(() => {
    if (intervalHandler) {
      clearInterval(intervalHandler)
    }

    if (!oracleContract) {
      return
    }

    setIntervalHandler(setInterval(function() {
      loadLatestPrice()
    }, 5000))

    loadLatestPrice()
  }, [oracleContract])

  const loadLatestPrice = async () => {
    if (oracleContract) {
      try {
        let value = await oracleContract.latestAnswer()
        setLatestPrice(ethers.utils.formatUnits(value, 8))
      } catch {}
    }
  }

  return (
    <div>
      <Row justify="center" style={{ margin: 35 }}>
        <Col>
          <Statistic title="BTC/USD" value={latestPrice} />
          <Button style={{ marginTop: 16 }} type="primary" onClick={loadLatestPrice}>
            Reload
          </Button>
        </Col>
      </Row>
    </div>
  );
}

export default Assignment1;
