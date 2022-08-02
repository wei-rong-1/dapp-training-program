import { ethers } from "ethers";
import { Button, Col, Row, Menu, Dropdown, Space } from "antd";
import React, { useEffect, useState, useMemo, useCallback } from "react";

export default function AdminTool({ userSigner, localProvider, targetNetwork }) {
  const mineBlocks = async (blocks) => {
    if (localProvider) {
      localProvider.send("hardhat_mine", [ethers.utils.hexStripZeros(ethers.BigNumber.from(blocks).toHexString())]);
    }
  }

  const setSignerBalance = async (amount) => {
    if (!userSigner) return
  
    const address = await userSigner.getAddress()
    const currentBalance = await localProvider.getBalance(address)
    await localProvider.send("hardhat_setBalance", [
      address,
      ethers.utils.hexStripZeros(currentBalance.add(ethers.BigNumber.from(amount)).toHexString()),
    ]);
  }

  const setTCROBalance = async (amount) => {
    const TCRO = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    const currentBalance = await localProvider.getBalance(TCRO)
    await localProvider.send("hardhat_setBalance", [
      TCRO,
      ethers.utils.hexStripZeros(currentBalance.add(ethers.BigNumber.from(amount)).toHexString()),
    ]);
  }

  const showTCROBalance = async (amount) => {
    const TCRO = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
    const currentBalance = await localProvider.getBalance(TCRO)
    alert(`cro: ${ethers.utils.formatEther(currentBalance)} \n number: ${currentBalance} \n hex: ${currentBalance.toHexString()}`);
  }

  const setForkTCROBalance = async (amount) => {
    const TCRO = "0xeAdf7c01DA7E93FdB5f16B0aa9ee85f978e89E95"
    const currentBalance = await localProvider.getBalance(TCRO)
    await localProvider.send("hardhat_setBalance", [
      TCRO,
      ethers.utils.hexStripZeros(currentBalance.add(ethers.BigNumber.from(amount)).toHexString()),
    ]);
  }

  const showForkTCROBalance = async (amount) => {
    const TCRO = "0xeAdf7c01DA7E93FdB5f16B0aa9ee85f978e89E95"
    const currentBalance = await localProvider.getBalance(TCRO)
    alert(`cro: ${ethers.utils.formatEther(currentBalance)} \n number: ${currentBalance} \n hex: ${currentBalance.toHexString()}`);
  }

  const onMenuClick = (e) => {
    console.log(e);
    if (e.key === '1') {
      mineBlocks(10)
    }

    if (e.key === '2') {
      mineBlocks(100)
    }

    if (e.key === '7') {
      mineBlocks(1000)
    }

    if (e.key === '8') {
      mineBlocks(10000)
    }

    if (e.key === '3') {
      mineBlocks(120000) // ~ (7 * 24 * 3600 / 5) blocks
    }

    if (e.key === '4') {
      setSignerBalance(ethers.utils.parseEther('500'))
    }

    if (e.key === '5') {
      setTCROBalance(ethers.utils.parseEther('500'))
    }

    if (e.key === '6') {
      showTCROBalance()
    }

    if (e.key === '9') {
      setForkTCROBalance(ethers.utils.parseEther('500'))
    }

    if (e.key === '10') {
      showForkTCROBalance()
    }

  };

  const menu = (
    <Menu onClick={onMenuClick}>
      <Menu.Item key={1}>
        <span>Mine 10 blocks</span>
      </Menu.Item>
      <Menu.Item key={2}>
        <span>Mine 100 blocks</span>
      </Menu.Item>
      <Menu.Item key={7}>
        <span>Mine 1000 blocks</span>
      </Menu.Item>
      <Menu.Item key={8}>
        <span>Mine 10000 blocks</span>
      </Menu.Item>
      <Menu.Item key={3}>
        <span>Mine 7-days(120000) blocks</span>
      </Menu.Item>
      <Menu.Divider></Menu.Divider>
      <Menu.Item key={4}>
        <span>Give me 500 CRO</span>
      </Menu.Item>
      <Menu.Item key={5}>
        <span>Give Local TCRO 500 CRO</span>
      </Menu.Item>
      <Menu.Item key={6}>
        <span>Show Local TCRO Balance</span>
      </Menu.Item>
      <Menu.Item key={9}>
        <span>Give Fork TCRO 500 CRO</span>
      </Menu.Item>
      <Menu.Item key={10}>
        <span>Show Fork TCRO Balance</span>
      </Menu.Item>
    </Menu>
  );

  return <Dropdown overlay={menu}>
    <Button type="default" size="large" shape="round">Tools</Button>
  </Dropdown>;
}
