import React from "react";
import { Typography } from "antd";

const { Title, Text } = Typography;

export default function Header({ link, title, subTitle, ...props }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "1.2rem" }}>
      <div>
        <Title level={4} style={{ margin: "0 0.5rem 0 0" }}>Anonymous Won</Title>
      </div>
      {props.children}
    </div>
  );
}
