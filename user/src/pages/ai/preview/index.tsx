import { Button, Text, View } from "@tarojs/components";
import Taro, { useLoad } from "@tarojs/taro";
import { useState } from "react";

import { foodGlyph, PageHeader } from "../../../components/ui";
import { api, type FoodOption } from "../../../services/api";
import "./index.scss";

export default function AiPreviewPage() {
  const [foods, setFoods] = useState<FoodOption[]>([]);
  useLoad(() => { api.foods({ size: 3 }).then((page) => setFoods(page.items)).catch(() => setFoods([])); });
  return (
    <View className='page page-secondary ai-page'>
      <PageHeader
        back
        title='AI 搭子推荐'
        subtitle='第一阶段组件预览，不会请求模型'
      />
      <View className='ai-banner'>
        <Text className='ai-banner-badge'>第二阶段功能</Text>
        <Text className='ai-banner-title'>以后，搭子会结合你的偏好推荐</Text>
        <Text className='ai-banner-note'>
          候选最多 3
          个；用户主动选择后才进入统一记录确认。当前不会生成内容，也不会写入记录。
        </Text>
      </View>
      <Text className='section-title'>候选卡预览</Text>
      {foods.map((food, index) => (
        <View className='candidate-card card' key={food.id}>
          <View className='candidate-index'>0{index + 1}</View>
          <View className='food-mark'>{foodGlyph(food.category)}</View>
          <View className='candidate-copy'>
            <Text className='candidate-name'>{food.name}</Text>
            <Text className='candidate-reason'>
              推荐理由将在第二阶段由已配置的模型生成
            </Text>
            <View className='chips'>
              {food.tags.slice(0, 2).map((tag) => (
                <Text className='mini-tag' key={tag}>
                  {tag}
                </Text>
              ))}
            </View>
          </View>
          <Text className='price'>¥{food.defaultPrice}</Text>
        </View>
      ))}
      <View className='card gold-card'>
        <Text className='action-title'>AI 推荐仅供日常饮食参考</Text>
        <Text className='action-note'>
          过敏、禁忌和健康信息不会在第一阶段用于自动判断；接入 AI
          前还需完成接口冻结、内容安全和隐私披露。
        </Text>
      </View>
      <Button className='primary-button' disabled>
        生成 AI 推荐（第二阶段开放）
      </Button>
      <Button
        className='secondary-button'
        onClick={() => Taro.switchTab({ url: "/pages/slot/index" })}
      >
        先用老虎机选择
      </Button>
    </View>
  );
}
