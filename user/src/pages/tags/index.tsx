import { Text, View } from "@tarojs/components";
import Taro, { useDidShow } from "@tarojs/taro";
import { useMemo, useState } from "react";

import { EmptyState, PageHeader } from "../../components/ui";
import { api, type FoodOption } from "../../services/api";

export default function TagsPage() {
  const [foods, setFoods] = useState<FoodOption[]>([]);
  useDidShow(() => { api.foods({ size: 100 }).then((page) => setFoods(page.items)).catch((reason) => Taro.showToast({ title: reason instanceof Error ? reason.message : '加载失败', icon: 'none' })); });
  const tags = useMemo(
    () =>
      [...new Set(foods.flatMap((food) => food.tags))]
        .map((tag) => ({
          tag,
          count: foods.filter((food) => food.tags.includes(tag)).length,
        }))
        .sort((a, b) => b.count - a.count),
    [foods],
  );
  return (
    <View className='page page-secondary'>
      <PageHeader
        back
        title='标签管理'
        subtitle='统一整理当前食物池中的标签'
        rightLabel='新增食物'
        onRight={() => Taro.navigateTo({ url: "/pages/foods/edit/index" })}
      />
      <View className='card gold-card'>
        <Text className='action-title'>标签来自食物</Text>
        <Text className='action-note'>
          标签随食物保存。当前后端未提供跨食物批量改名或删除接口，请在食物编辑页调整。
        </Text>
      </View>
      <Text className='section-title'>全部标签</Text>
      {tags.map(({ tag, count }) => (
        <View className='card row' style='margin-bottom:16rpx' key={tag}>
          <View><Text className='action-title'>{tag}</Text><Text className='action-note'>用于 {count} 个食物</Text></View>
        </View>
      ))}
      {tags.length === 0 && (
        <EmptyState
          title='还没有标签'
          note='编辑食物时输入标签，它们会出现在这里'
        />
      )}
    </View>
  );
}
