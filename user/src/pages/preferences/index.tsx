import { Button, Input, Text, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { useState } from "react";

import { PageHeader } from "../../components/ui";
import { api, type PreferenceItem } from "../../services/api";
import "./index.scss";

type GroupKey =
  | "tastePreferences"
  | "medicalAllergies"
  | "dietaryRestrictions"
  | "dislikes";
const groups: Array<{
  key: GroupKey;
  title: string;
  note: string;
  options: Array<{ value: string; label: string }>;
}> = [
  {
    key: "tastePreferences",
    title: "口味偏好",
    note: "告诉搭子你更喜欢的味道",
    options: [
      { value: "TASTE_LIGHT", label: "清淡" },
      { value: "TASTE_SPICY", label: "偏辣" },
      { value: "TASTE_SWEET", label: "偏甜" },
      { value: "TASTE_SALTY", label: "偏咸" },
    ],
  },
  {
    key: "medicalAllergies",
    title: "医疗过敏",
    note: "一期仅保存信息，不做医疗判断",
    options: [
      { value: "ALLERGY_PEANUT", label: "花生过敏" },
      { value: "ALLERGY_SEAFOOD", label: "海鲜过敏" },
      { value: "ALLERGY_DAIRY", label: "乳制品过敏" },
      { value: "ALLERGY_EGG", label: "蛋类过敏" },
    ],
  },
  {
    key: "dietaryRestrictions",
    title: "饮食禁忌",
    note: "记录明确不吃的食材范围",
    options: [
      { value: "RESTRICTION_VEGETARIAN", label: "素食" },
      { value: "RESTRICTION_NO_PORK", label: "不吃猪肉" },
      { value: "RESTRICTION_NO_BEEF", label: "不吃牛肉" },
      { value: "RESTRICTION_NO_OFFAL", label: "不吃动物内脏" },
    ],
  },
  {
    key: "dislikes",
    title: "普通不喜欢",
    note: "不属于过敏，只是个人偏好",
    options: [
      { value: "DISLIKE_CILANTRO", label: "不吃香菜" },
      { value: "DISLIKE_SCALLION", label: "不吃葱" },
      { value: "DISLIKE_GINGER", label: "不吃姜" },
      { value: "DISLIKE_GARLIC", label: "不吃蒜" },
    ],
  },
];
export default function PreferencesPage() {
  const empty: Record<GroupKey, PreferenceItem[]> = {
    tastePreferences: [],
    medicalAllergies: [],
    dietaryRestrictions: [],
    dislikes: [],
  };
  const [selected, setSelected] =
    useState<Record<GroupKey, PreferenceItem[]>>(empty);
  const [custom, setCustom] = useState<Record<GroupKey, string>>({
    tastePreferences: "",
    medicalAllergies: "",
    dietaryRestrictions: "",
    dislikes: "",
  });
  useLoad(() => {
    api
      .preferences()
      .then((value) =>
        setSelected({
          tastePreferences: value.tastePreferences,
          medicalAllergies: value.medicalAllergies,
          dietaryRestrictions: value.dietaryRestrictions,
          dislikes: value.dislikes,
        }),
      )
      .catch((reason) =>
        Taro.showToast({
          title: reason instanceof Error ? reason.message : "加载失败",
          icon: "none",
        }),
      );
  });
  const toggle = (key: GroupKey, value: string) =>
    setSelected((current) => ({
      ...current,
      [key]: current[key].some(
        (item) => item.type === "PRESET" && item.value === value,
      )
        ? current[key].filter(
            (item) => !(item.type === "PRESET" && item.value === value),
          )
        : [...current[key], { type: "PRESET", value }],
    }));
  const addCustom = (key: GroupKey) => {
    const value = custom[key].trim();
    if (!value || Array.from(value).length > 20)
      return Taro.showToast({
        title: "自定义内容需为1～20个字符",
        icon: "none",
      });
    if (selected[key].length >= 50)
      return Taro.showToast({ title: "每类最多50项", icon: "none" });
    setSelected((current) => ({
      ...current,
      [key]: [...current[key], { type: "CUSTOM", value }],
    }));
    setCustom((current) => ({ ...current, [key]: "" }));
  };
  const removeCustom = (key: GroupKey, value: string) =>
    setSelected((current) => ({
      ...current,
      [key]: current[key].filter(
        (item) => !(item.type === "CUSTOM" && item.value === value),
      ),
    }));
  const save = async () => {
    try {
      await api.updatePreferences(selected);
      Taro.showToast({ title: "饮食偏好已保存", icon: "success" });
      setTimeout(() => Taro.navigateBack(), 350);
    } catch (reason) {
      Taro.showToast({
        title: reason instanceof Error ? reason.message : "保存失败",
        icon: "none",
      });
    }
  };
  return (
    <View className='page page-secondary preferences-page'>
      <PageHeader
        back
        title='口味偏好与忌口'
        subtitle='四类信息分开保存，“无”不会写入数据'
      />
      {groups.map((group) => (
        <View className='preference-card card' key={group.key}>
          <View className='row'>
            <View>
              <Text className='preference-title'>{group.title}</Text>
              <Text className='action-note'>{group.note}</Text>
            </View>
            <Text
              className={`chip ${selected[group.key].length === 0 ? "chip-active" : ""}`}
              onClick={() =>
                setSelected((current) => ({ ...current, [group.key]: [] }))
              }
            >
              无
            </Text>
          </View>
          <View className='chips preset-list'>
            {group.options.map((option) => (
              <Text
                className={`chip ${selected[group.key].some((item) => item.type === "PRESET" && item.value === option.value) ? "chip-active" : ""}`}
                key={option.value}
                onClick={() => toggle(group.key, option.value)}
              >
                {option.label}
              </Text>
            ))}
          </View>
          {selected[group.key].filter((item) => item.type === "CUSTOM").length >
            0 && (
            <View className='chips custom-list'>
              {selected[group.key]
                .filter((item) => item.type === "CUSTOM")
                .map((item) => (
                  <Text
                    className='chip custom-chip'
                    key={item.value}
                    onClick={() => removeCustom(group.key, item.value)}
                  >
                    {item.value} ×
                  </Text>
                ))}
            </View>
          )}
          <View className='custom-input-row'>
            <Input
              className='input'
              maxlength={20}
              value={custom[group.key]}
              placeholder='添加自定义内容'
              onInput={(e) =>
                setCustom((current) => ({
                  ...current,
                  [group.key]: e.detail.value,
                }))
              }
            />
            <Button
              className='mini-button primary-button'
              onClick={() => addCustom(group.key)}
            >
              添加
            </Button>
          </View>
        </View>
      ))}
      <Button className='primary-button' onClick={save}>
        保存全部偏好
      </Button>
    </View>
  );
}
