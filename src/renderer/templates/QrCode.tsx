import { Layout } from './Layout.tsx';

interface QrCodeProps {
  qrImageBase64: string;
  userId: string;
}

export function QrCodePage(props: QrCodeProps) {
  const outdateTime = new Date(Date.now() + 120 * 1000).toLocaleString();
  return (
    <Layout title="扫码登录">
      <div id="capture" class="w-fit flex flex-col items-center justify-center p-8">
        <div class="bg-gray-50 rounded-2xl shadow-lg p-8 max-w-sm w-full">
          <h2 class="text-xl font-bold text-gray-800 text-center mb-4">扫码登录·原神赛事</h2>
          <div class="bg-white p-4 rounded-xl border border-gray-200 mb-4">
            <img src={`data:image/png;base64,${props.qrImageBase64}`} class="w-full h-auto" />
          </div>
          <p class="text-sm text-gray-500 text-center">打开<span class="text-yellow-600">米游社/游戏/云游戏App</span>，扫一扫登录</p>
          <p class="text-xs text-gray-400 text-center mt-2">二维码失效时间：{outdateTime}</p>
          <p class="text-xs text-gray-400 text-center mt-2">扫描该二维码登录的账户将与 {props.userId} 关联</p>
          <p class="text-xs text-gray-400 text-center mt-2">登录即视为授权 scoreboard-bot-server 使用您的七圣天梯数据</p>
        </div>
      </div>
    </Layout>
  );
}
