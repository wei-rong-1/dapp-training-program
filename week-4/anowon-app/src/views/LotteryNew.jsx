import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { Button, Col, Row, message, Modal, Form, Input, InputNumber, Radio } from "antd";

export default function LotteryNew({ visible, setVisible, factoryContract, onCreate, ...props }) {
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  const handleFinish = async values => {
    const { nonce, denomination, waitingBlocks, lockingBlocks } = values;
    const nonceHash = ethers.utils.keccak256(ethers.utils.formatBytes32String(nonce));
    setSubmitLoading(true);

    const tx = await factoryContract.createLottery(
      nonceHash,
      ethers.utils.parseEther(denomination),
      waitingBlocks,
      lockingBlocks,
    );

    const receipt = await tx.wait();
    // console.log(receipt);

    if (receipt.blockNumber) {
      message.success({
        content: `Lottery created, TX: ${tx.hash}`,
        duration: 3,
      });
    } else {
      message.error({
        content: `Failed to create new lottery , TX: ${tx.hash}`,
        duration: 3,
      });
    }
    setVisible(false);
    setSubmitLoading(false);
    onCreate();
  };

  const handleFinishFailed = (...args) => {
    console.log("handleFinishFailed: ", args);
  };

  const handleCancel = () => {
    console.log("Clicked cancel button");
    setVisible(false);
  };

  useEffect(() => {
    if (visible) {
      form.resetFields()
    }
  }, [visible])

  return (
    <div>
      <Button size="large" shape="round" type="primary" onClick={() => setVisible(true)}>
        New Lottery
      </Button>

      <Modal title="New Lottery" visible={visible} onCancel={handleCancel} footer={null}>
        <Form
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          onFinish={handleFinish}
          onFinishFailed={handleFinishFailed}
          autoComplete="off"
          form={form}
        >
          <Form.Item label="Nonce" name="nonce" rules={[{ required: true, message: "Please input lottery nonce" }]}>
            <Input />
          </Form.Item>

          <Form.Item
            label="Denomination"
            name="denomination"
            rules={[{ required: true, message: "Please input denomination" }]}
          >
            <Radio.Group>
              <Radio value="100">100 CRO</Radio>
              <Radio value="300">300 CRO</Radio>
              <Radio value="500">500 CRO</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="Waiting Blocks"
            name="waitingBlocks"
            rules={[{ required: true, message: "Please input blocks number to wait" }]}
          >
            <InputNumber stringMode default="100" min="1" max="1000000000" step="10" />
          </Form.Item>

          <Form.Item
            label="Locking Blocks"
            name="lockingBlocks"
            rules={[{ required: true, message: "Please input blocks number to lock" }]}
          >
            <InputNumber stringMode default="500" min="1" max="1000000000" step="10" />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Button type="primary" htmlType="submit" loading={submitLoading}>
              Create Lottery
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
