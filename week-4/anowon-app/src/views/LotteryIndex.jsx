import { ethers } from "ethers";
import { Button, Col, Row } from "antd";
import React, { useEffect, useState, useMemo, useCallback } from "react";

import * as factoryArtifact from "../contracts/CROLotteryFactory.json";

import AdminTool from "./AdminTool";
import LotteryNew from "./LotteryNew";
import LotteryList from "./LotteryList";

function LotteryIndex({ userSigner, localProvider, targetNetwork }) {
  const [factoryContract, setFactoryContract] = useState();
  const [currentBlock, setCurrentBlock] = useState();
  const [factoryOwner, setFactoryOwner] = useState();
  const [signerAddress, setSignerAddress] = useState();
  const [lotteryCount, setLotteryCount] = useState(0);

  const [newLotteryVisible, setNewLotteryVisible] = useState(false);


  const factoryDeployments = {
    'localhost': '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9',
    // 'localhost': '0xf1B87E513386d39543C36434F5b9636e83c67416', // only for forked mainnet
    'mainnet': '0xf1B87E513386d39543C36434F5b9636e83c67416'
  }

  useEffect(async () => {
    let providerOrSigner = userSigner ? userSigner : localProvider;
    if (providerOrSigner) {
      // Set contracts
      setFactoryContract(new ethers.Contract(factoryDeployments[targetNetwork.name], factoryArtifact.abi, providerOrSigner))

      fetchFactoryOwner();
      fetchCurrentBlock();
      fetchSignerAddress();
    }
  }, [userSigner, localProvider, targetNetwork])

  useEffect(() => {
    fetchLotteryCount();
  }, [factoryContract]);


  const fetchFactoryOwner = useCallback(async () => {
    if (factoryContract) {
      const factoryOwner = await factoryContract.owner();
      setFactoryOwner(factoryOwner)
    }
  }, [factoryContract])

  const fetchCurrentBlock = async () => {
    if (localProvider) {
      const currentBlock = await localProvider.getBlockNumber();
      setCurrentBlock(currentBlock)
    }
  }

  const fetchSignerAddress = useCallback(async () => {
    if (userSigner) {
      setSignerAddress(await userSigner.getAddress())
    } else {
      setSignerAddress(null)
    }
  }, [userSigner])

  const fetchLotteryCount = async () => {
    if (!factoryContract) return;
    const count = await factoryContract.counter();
    setLotteryCount(count);
  }

  const isFactoryOwner = useMemo(() => {
    return !!signerAddress && signerAddress === factoryOwner
  }, [signerAddress, factoryOwner]);

  const handleLotteryCreated = async () => {
    fetchLotteryCount();
  }

  const handleReload = async () => {
    setLotteryCount(0)
    fetchLotteryCount();
    fetchCurrentBlock();
  }

  return (
    <div className="lottery-index">
      {
        <div className="lottery-admin">
          <Row>
            <Col span={4}>
              {
                isFactoryOwner &&
                <LotteryNew
                  factoryContract={factoryContract}
                  visible={newLotteryVisible}
                  setVisible={setNewLotteryVisible}
                  onCreate={handleLotteryCreated}
                />
              }
            </Col>
            <Col span={4}>
              { targetNetwork.name === 'localhost' &&
                <AdminTool
                  userSigner={userSigner}
                  localProvider={localProvider}
                  targetNetwork={targetNetwork}
                  currentBlock={currentBlock}
                />
              }
              <a style={{ marginLeft: "15px" }} onClick={handleReload}>Reload</a>
            </Col>
          </Row>
        </div>
      }

      <LotteryList
        userSigner={userSigner}
        localProvider={localProvider}
        factoryContract={factoryContract}
        currentBlock={currentBlock}
        lotteryCount={lotteryCount}
      />

    </div>
  );
}

export default LotteryIndex;
