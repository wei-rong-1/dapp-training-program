import { ethers } from "ethers";
import React, { useEffect, useState } from "react";
import { Button, Col, Row, Tooltip, message, Modal, Form, Input, InputNumber, Radio } from "antd";
import { ReloadOutlined } from "@ant-design/icons";

export default function LotteryReveal({ visible, setVisible, lotteryContract, onSuccess, ...props }) {
  const [submitLoading, setSubmitLoading] = useState(false);
  const [form] = Form.useForm();

  const handleFinish = async values => {
    const { nonce } = values;
    setSubmitLoading(true);

    const nonceData = ethers.utils.formatBytes32String(nonce)

    try {
      const tx = await lotteryContract.reveal(nonceData);
      const receipt = await tx.wait();
      if (receipt.blockNumber > 0) {
        message.success("Reveal successfully");
        onSuccess()
      } else {
        message.error("Failed to reveal");
      }
    } catch {
      message.error("Failed to reveal");
    } finally {
      setVisible(false);
      setSubmitLoading(false);
    }
  };

  const handleFinishFailed = (...args) => {
    console.log("handleFinishFailed: ", args);
  };

  const handleCancel = () => {
    console.log("Clicked cancel button");
    setVisible(false);
  };

  return (
    <div>
      <Modal title="Reveal" visible={visible} onCancel={handleCancel} footer={null}>
        <Form
          form={form}
          labelCol={{ span: 8 }}
          wrapperCol={{ span: 16 }}
          onFinish={handleFinish}
          onFinishFailed={handleFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            label="Nonce"
            name="nonce"
            rules={[{ required: true, message: "Please input the Nonce used to create the lottery" }]}
          >
            <Input />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 8, span: 16 }}>
            <Button type="primary" htmlType="submit" disabled={submitLoading}>
              Reveal
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
