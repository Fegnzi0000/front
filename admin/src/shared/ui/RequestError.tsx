import { Alert, Button, Space, Typography } from 'antd'
import { ApiClientError } from '../api/client'
import { CopyText } from './CopyText'

export function RequestError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const apiError = error instanceof ApiClientError ? error : null
  return (
    <Alert
      type="error"
      showIcon
      title={apiError?.message ?? '数据加载失败'}
      description={
        <Space orientation="vertical" size={4}>
          {apiError?.requestId && <Typography.Text type="secondary">请求编号：<CopyText value={apiError.requestId} /></Typography.Text>}
          {onRetry && <Button size="small" onClick={onRetry}>重新加载</Button>}
        </Space>
      }
    />
  )
}
