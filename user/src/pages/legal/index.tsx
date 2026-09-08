import { Text, View } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { useState } from 'react'
import { PageHeader } from '../../components/ui'
import { legalDocuments } from '../../domain/legal'
export default function LegalPage() {
  const [kind, setKind] = useState<keyof typeof legalDocuments>('privacy')
  useLoad(options => { if (options.kind === 'terms') setKind(options.kind) })
  const document = legalDocuments[kind]
  return <View className='page page-secondary'><PageHeader back title={document.title} subtitle='请完整阅读，可随时返回' /><View className='card'><Text selectable style={{ whiteSpace: 'pre-wrap', lineHeight: 1.9 }}>{document.text}</Text></View></View>
}
