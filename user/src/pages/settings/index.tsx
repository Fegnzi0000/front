import { Button, Switch, Text, View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { useState } from "react";

import { PageHeader } from "../../components/ui";
import { api } from "../../services/api";

export default function SettingsPage() {
  const [sound, setSound] = useState(
    Boolean(Taro.getStorageSync("ai-ganfan.sound")),
  );
  const change = (
    key: string,
    value: boolean,
    setter: (value: boolean) => void,
  ) => {
    setter(value);
    Taro.setStorageSync(key, value);
  };
  const logout = async () => {
    const result = await Taro.showModal({
      title: "退出登录？",
      content: "将撤销当前会话并回到登录页。",
      confirmText: "退出",
    });
    if (result.confirm) {
      await api.logout();
      Taro.reLaunch({ url: "/pages/auth/login/index" });
    }
  };
  return (
    <View className='page page-secondary'>
      <PageHeader back title='应用设置' subtitle='声音、隐私与账号' />
      <Text className='group-title'>声音</Text>
      <View className='card'>
        <View className='row'>
          <View>
            <Text className='action-title'>老虎机音效</Text>
            <Text className='action-note'>开启后在转动时播放，只保存在当前设备</Text>
          </View>
          <Switch
            checked={sound}
            color='#A94700'
            onChange={(e) =>
              change("ai-ganfan.sound", e.detail.value, setSound)
            }
          />
        </View>
      </View>
      <Text className='group-title'>数据与隐私</Text>
      <View
        className='card action-tile'
        onClick={() =>
          Taro.showModal({
            title: "隐私保护说明",
            content:
              "食物、偏好和饮食记录保存在后端；本机只保存登录令牌和应用展示设置。",
            showCancel: false,
          })
        }
      >
        <View className='action-icon'>隐</View>
        <View className='action-copy'>
          <Text className='action-title'>隐私保护说明</Text>
          <Text className='action-note'>查看数据使用方式</Text>
        </View>
        <Text className='action-arrow'>›</Text>
      </View>
      <Text className='group-title'>关于与退出</Text>
      <View className='card'>
        <View className='row'>
          <Text>是啊，吃什么？</Text>
          <Text className='muted'>联调版</Text>
        </View>
      </View>
      <Button className='secondary-button' onClick={logout}>
        退出登录
      </Button>
    </View>
  );
}
