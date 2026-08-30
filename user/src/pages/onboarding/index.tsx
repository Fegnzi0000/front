import { Button, Input, Switch, Text, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { useState } from "react";

import { PageHeader } from "../../components/ui";
import { validateBudget } from "../../domain/core";
import { api, type FoodOption, type PreferenceItem } from "../../services/api";
import "./index.scss";

const groups = [
  {
    key: "tastePreferences" as const,
    title: "口味偏好",
    options: [
      ["TASTE_LIGHT", "清淡"],
      ["TASTE_SPICY", "偏辣"],
      ["TASTE_SWEET", "偏甜"],
      ["TASTE_SALTY", "偏咸"],
    ],
  },
  {
    key: "medicalAllergies" as const,
    title: "医疗过敏",
    options: [
      ["ALLERGY_PEANUT", "花生过敏"],
      ["ALLERGY_SEAFOOD", "海鲜过敏"],
      ["ALLERGY_DAIRY", "乳制品过敏"],
      ["ALLERGY_EGG", "蛋类过敏"],
    ],
  },
  {
    key: "dietaryRestrictions" as const,
    title: "饮食禁忌",
    options: [
      ["RESTRICTION_VEGETARIAN", "素食"],
      ["RESTRICTION_NO_PORK", "不吃猪肉"],
      ["RESTRICTION_NO_BEEF", "不吃牛肉"],
      ["RESTRICTION_NO_OFFAL", "不吃动物内脏"],
    ],
  },
  {
    key: "dislikes" as const,
    title: "普通不喜欢",
    options: [
      ["DISLIKE_CILANTRO", "不吃香菜"],
      ["DISLIKE_SCALLION", "不吃葱"],
      ["DISLIKE_GINGER", "不吃姜"],
      ["DISLIKE_GARLIC", "不吃蒜"],
    ],
  },
];
type Key = (typeof groups)[number]["key"];
export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState('');
  const [foods, setFoods] = useState<FoodOption[]>([]);
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [budget, setBudget] = useState("50.00");
  const [selected, setSelected] = useState<Record<Key, PreferenceItem[]>>({
    tastePreferences: [],
    medicalAllergies: [],
    dietaryRestrictions: [],
    dislikes: [],
  });
  const [error, setError] = useState("");
  useLoad(() => { Promise.all([api.me(), api.foods({ size: 6 })]).then(([user, page]) => { setNickname(user.nickname); setFoods(page.items); }).catch((reason) => setError(reason instanceof Error ? reason.message : '加载失败')); });
  const toggle = (key: Key, value: string) =>
    setSelected((current) => ({
      ...current,
      [key]: current[key].some((item) => item.value === value)
        ? current[key].filter((item) => item.value !== value)
        : [...current[key], { type: "PRESET", value }],
    }));
  const finish = async (skip = false) => {
    if (!skip) {
      const name = nickname.trim();
      if (!name || Array.from(name).length > 20) {
        setStep(0);
        return setError("昵称需为1～20个字符");
      }
      const budgetError = validateBudget(
        budgetEnabled,
        budgetEnabled ? budget : null,
      );
      if (budgetError) {
        setStep(0);
        return setError(budgetError);
      }
      try { await api.submitOnboarding({ nickname: name, budgetEnabled, dailyBudget: budgetEnabled ? budget : null, ...selected }); } catch (reason) { return setError(reason instanceof Error ? reason.message : '保存失败'); }
    }
    if (skip) { try { await api.submitOnboarding({ nickname: null, budgetEnabled: false, dailyBudget: null, tastePreferences: [], medicalAllergies: [], dietaryRestrictions: [], dislikes: [] }); } catch (reason) { return setError(reason instanceof Error ? reason.message : '保存失败'); } }
    Taro.switchTab({ url: "/pages/home/index" });
  };
  const next = () => {
    if (step === 0) {
      const budgetError = validateBudget(
        budgetEnabled,
        budgetEnabled ? budget : null,
      );
      if (budgetError) return setError(budgetError);
    }
    setError("");
    setStep((value) => Math.min(2, value + 1));
  };
  return (
    <View className='page page-secondary onboarding-page'>
      <PageHeader
        title='欢迎加入'
        subtitle={`第 ${step + 1} / 3 步，所有设置以后都能修改`}
        rightLabel='跳过'
        onRight={() => finish(true)}
      />
      <View className='progress-row'>
        {[0, 1, 2].map((item) => (
          <View
            key={item}
            className={`progress-dot ${item <= step ? "active" : ""}`}
          />
        ))}
      </View>
      {step === 0 && (
        <>
          <Text className='onboarding-title'>先设置称呼和预算</Text>
          <Text className='page-subtitle'>
            预算不是限制，只是帮你更清楚今天花了多少。
          </Text>
          <View className='card'>
            <View className='field'>
              <Text className='label'>昵称</Text>
              <Input
                className='input'
                maxlength={20}
                value={nickname}
                onInput={(e) => setNickname(e.detail.value)}
              />
            </View>
            <View className='row'>
              <View>
                <Text className='label'>启用每日预算</Text>
                <Text className='action-note'>关闭也可以正常使用全部功能</Text>
              </View>
              <Switch
                checked={budgetEnabled}
                color='#A94700'
                onChange={(e) => setBudgetEnabled(e.detail.value)}
              />
            </View>
            {budgetEnabled && (
              <View className='field' style='margin-top:28rpx'>
                <Text className='label'>每天计划花费</Text>
                <View className='money-input'>
                  <Text>¥</Text>
                  <Input
                    type='digit'
                    value={budget}
                    onInput={(e) => setBudget(e.detail.value)}
                  />
                </View>
              </View>
            )}
            {error && <Text className='error'>{error}</Text>}
          </View>
        </>
      )}
      {step === 1 && (
        <>
          <Text className='onboarding-title'>口味和忌口</Text>
          <Text className='page-subtitle'>
            选择“无”就是清空该组；一期只保存，不用于自动医疗判断。
          </Text>
          {groups.map((group) => (
            <View className='card preference-mini' key={group.key}>
              <View className='row'>
                <Text className='action-title'>{group.title}</Text>
                <Text
                  className={`chip ${selected[group.key].length === 0 ? "chip-active" : ""}`}
                  onClick={() =>
                    setSelected((current) => ({ ...current, [group.key]: [] }))
                  }
                >
                  无
                </Text>
              </View>
              <View className='chips' style='margin-top:18rpx'>
                {group.options.map(([value, label]) => (
                  <Text
                    className={`chip ${selected[group.key].some((item) => item.value === value) ? "chip-active" : ""}`}
                    key={value}
                    onClick={() => toggle(group.key, value)}
                  >
                    {label}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </>
      )}
      {step === 2 && (
        <>
          <Text className='onboarding-title'>你的食物池已准备好</Text>
          <Text className='page-subtitle'>
            系统初始化了 10 个默认食物，它们都可以编辑或删除。
          </Text>
          <View className='food-preview-grid'>
            {foods.slice(0, 6).map((food) => (
              <View className='food-preview' key={food.id}>
                <Text>{food.name}</Text>
                <Text>
                  {food.category} · ¥{food.defaultPrice}
                </Text>
              </View>
            ))}
          </View>
          <View className='card green-card'>
            <Text className='action-title'>准备完成</Text>
            <Text className='action-note'>
              进入首页后，可以打开老虎机、手动记录，或继续管理食物池。
            </Text>
          </View>
        </>
      )}
      <View className='onboarding-actions'>
        {step > 0 && (
          <Button
            className='secondary-button'
            onClick={() => setStep((value) => value - 1)}
          >
            上一步
          </Button>
        )}
        <Button
          className='primary-button'
          onClick={() => (step === 2 ? finish(false) : next())}
        >
          {step === 2 ? "开始使用" : "下一步"}
        </Button>
      </View>
    </View>
  );
}
