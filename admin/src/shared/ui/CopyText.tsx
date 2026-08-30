import { CopyOutlined } from '@ant-design/icons'
import { Button, Tooltip, message } from 'antd'

export function CopyText({ value, display }: { value: string; display?: string }) {
  const copy = async () => {
    await navigator.clipboard.writeText(value)
    void message.success('已复制')
  }
  return (
    <span className="copy-text">
      <span title={value}>{display ?? value}</span>
      <Tooltip title="复制"><Button type="text" size="small" icon={<CopyOutlined />} aria-label={`复制 ${display ?? value}`} onClick={() => void copy()} /></Tooltip>
    </span>
  )
}
