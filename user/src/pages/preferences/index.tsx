import { Button, Input, Text, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { useState } from "react";

import { PageHeader } from "../../components/ui";
import { api, type PreferenceItem, type ConsentStatus } from "../../services/api";
import { legalDocuments } from '../../domain/legal';
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
  const [consent, setConsent] = useState<ConsentStatus | null>(null);
  const [consentBusy, setConsentBusy] = useState(false);
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
    api.consent().then(setConsent).catch(() => setConsent(null));
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
      await api.updatePreferences({ ...selected, medicalAllergies: consent?.medicalAllowed ? selected.medicalAllergies : [] });
      Taro.showToast({ title: "饮食偏好已保存", icon: "success" });
      setTimeout(() => Taro.navigateBack(), 350);
    } catch (reason) {
      Taro.showToast({
        title: reason instanceof Error ? reason.message : "保存失败",
        icon: "none",
      });
    }
  };
  const changeMedicalConsent = async () => {
    if (!consent || consentBusy) return;
    const enabled = consent.medicalAllowed;
    if (!enabled && consent.ageBand !== 'ADULT') return;
    setConsentBusy(true);
    try {
      const answer = await Taro.showModal({ title: enabled ? '撤回并清空过敏信息？' : '医疗过敏信息单独同意', content: enabled ? '将停止处理并清除在线过敏记录，不影响其他功能。' : legalDocuments.medical.text, confirmText: enabled ? '撤回清空' : '单独同意', cancelText: '不同意' });
      if (!answer.confirm) return;
      setConsent(await api.medicalConsent(!enabled));
      if (!enabled) { const latest = await api.preferences(); setSelected(current => ({ ...current, medicalAllergies: latest.medicalAllergies })); }
      if (enabled) setSelected(current => ({ ...current, medicalAllergies: [] }));
    } catch (reason) { await Taro.showToast({ title: reason instanceof Error ? reason.message : '操作失败', icon: 'none' }); }
    finally { setConsentBusy(false); }
  };
  return (
    <View className='page page-secondary preferences-page'>
      <PageHeader
        back
        title='口味偏好与忌口'
        subtitle='四类信息分开保存，“无”不会写入数据'
      />
      <View className='card'><Text className='action-note'>医疗过敏仅供个人备忘，不参与自动避敏。随机选餐结果不保证安全，请核实配料和交叉接触风险。</Text>
        <Text className='text-link' onClick={() => Taro.navigateTo({ url: '/pages/legal/index?kind=medical' })}>阅读医疗过敏信息处理说明</Text>
        <Button disabled={!consent || consentBusy || consent.ageBand !== 'ADULT'} onClick={changeMedicalConsent}>{consent?.medicalAllowed ? '撤回同意并清空过敏信息' : '单独同意并启用过敏备忘'}</Button>
        {consent?.ageBand !== 'ADULT' && <Text className='action-note'>首版仅向已满十八周岁用户开放此可选功能。</Text>}
      </View>
      {groups.filter(group => group.key !== 'medicalAllergies' || consent?.medicalAllowed).map((group) => (
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
