import { Button, Input, Switch, Text, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { useState } from "react";

import { PageHeader } from "../../components/ui";
import { validateBudget } from "../../domain/core";
import { api } from "../../services/api";

export default function BudgetPage() {
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState("50.00");
  const [error, setError] = useState("");
  useLoad(() => {
    api
      .preferences()
      .then((value) => {
        setEnabled(value.budgetEnabled);
        setAmount(value.dailyBudget ?? "50.00");
      })
      .catch((reason) =>
        setError(reason instanceof Error ? reason.message : "加载失败"),
      );
  });
  const save = async () => {
    const validation = validateBudget(enabled, enabled ? amount : null);
    if (validation) return setError(validation);
    try {
      await api.updatePreferences({
        budgetEnabled: enabled,
        dailyBudget: enabled ? amount : null,
      });
      Taro.showToast({ title: "预算已保存", icon: "success" });
      setTimeout(() => Taro.navigateBack(), 350);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "保存失败");
    }
  };
  return (
    <View className='page page-secondary'>
      <PageHeader
        back
        title='每日预算'
        subtitle='只影响之后的预算展示，不改写历史记录'
      />
      <View className='card gold-card'>
        <View className='row'>
          <View>
            <Text className='action-title'>启用每日预算</Text>
            <Text className='action-note'>关闭后不计算剩余和超支</Text>
          </View>
          <Switch
            checked={enabled}
            color='#A94700'
            onChange={(e) => {
              setEnabled(e.detail.value);
              setError("");
            }}
          />
        </View>
        {enabled && (
          <View className='field' style='margin-top:32rpx'>
            <Text className='label'>每天计划花费</Text>
            <View className='money-input'>
              <Text>¥</Text>
              <Input
                className='money-value-input'
                type='digit'
                value={amount}
                onInput={(e) => setAmount(e.detail.value)}
              />
            </View>
            <Text className='action-note'>
              允许 0.00～100000.00，最多两位小数
            </Text>
          </View>
        )}
        {error && <Text className='error'>{error}</Text>}
      </View>
      <View className='card green-card' style='margin-top:24rpx'>
        <Text className='action-title'>温和提醒</Text>
        <Text className='action-note'>
          预算用于帮助你了解花费，不会限制你记录，也不会自动影响第一阶段的老虎机结果。
        </Text>
      </View>
      <Button className='primary-button' onClick={save}>
        保存预算设置
      </Button>
    </View>
  );
}
