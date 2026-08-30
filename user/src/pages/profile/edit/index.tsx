import { Button, Input, Text, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { useState } from "react";

import { PageHeader } from "../../../components/ui";
import { api, type User } from "../../../services/api";

export default function ProfileEditPage() {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  useLoad(() => {
    api
      .me()
      .then((next) => {
        setUser(next);
        setNickname(next.nickname);
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "加载失败"),
      );
  });
  const save = async () => {
    const value = nickname.trim();
    if (!value || Array.from(value).length > 20)
      return setError("昵称需为1～20个字符");
    try {
      await api.updateProfile(value);
      Taro.showToast({ title: "资料已保存", icon: "success" });
      setTimeout(() => Taro.navigateBack(), 350);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  };
  return (
    <View className='page page-secondary'>
      <PageHeader
        back
        title='个人资料'
        subtitle='头像功能后续接入微信授权，邮箱不可修改'
      />
      <View className='card' style='text-align:center'>
        <View className='profile-avatar' style='margin:0 auto 24rpx'>
          饭
        </View>
        <View className='field' style='text-align:left;margin-top:32rpx'>
          <Text className='label'>昵称</Text>
          <Input
            className='input'
            maxlength={20}
            value={nickname}
            onInput={(e) => setNickname(e.detail.value)}
          />
          {error && <Text className='error'>{error}</Text>}
        </View>
        <View className='field' style='text-align:left'>
          <Text className='label'>注册邮箱</Text>
          <View className='input row'>
            <Text>{user?.email ?? ""}</Text>
            <Text className='muted'>只读</Text>
          </View>
        </View>
      </View>
      <Button className='primary-button' onClick={save}>
        保存个人资料
      </Button>
    </View>
  );
}
