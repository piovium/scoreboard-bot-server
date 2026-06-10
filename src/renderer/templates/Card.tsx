import { Layout } from './Layout.tsx';
import type { PageInfo, PeakRankData, GameRecord } from '../../types.ts';
import { Show } from 'solid-js';

export interface CardProps {
  pageInfo: PageInfo;
  peakRank: PeakRankData;
  gameRecords: GameRecord[];
  gameUid: string;
}

function fmtTime(ts: string) {
  const d = new Date(Number(ts) * 1000);
  return d.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function oppUid(transNo: string, myUid: string) {
  const parts = transNo.split('_');
  return parts[0] === myUid ? parts[1] : parts[0];
}

function PlayerCard(props: { pageInfo: PageInfo; peakRank: PeakRankData; gameUid: string }) {
  const ladderText = () => {
    const l =
      props.pageInfo.ladder_info.large > 0
        ? ['黄铜', '星银', '赤金', '影幻'][props.pageInfo.ladder_info.large - 1]
        : '暂无段位';
    const s =
      props.pageInfo.ladder_info.large === 4
        ? props.pageInfo.peak_score
        : '★'.repeat(props.pageInfo.ladder_info.small);
    return `${l} ${s}`;
  };
  return (
    <div class="bg-white m-4 rounded-xl shadow-sm p-5 flex items-center gap-4">
      <img
        src={props.pageInfo.avatar_url}
        class="w-20 h-20 rounded-full border-2 border-amber-300 flex-shrink-0"
      />
      <div class="flex-1 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div class="col-span-2 font-bold text-lg text-gray-800">{props.pageInfo.nickname}</div>
        <div>
          <span class="text-gray-400">UID</span>{' '}
          <span class="text-gray-700 ml-2">{props.gameUid}</span>
        </div>
        <div>
          <span class="text-gray-400">分段</span>{' '}
          <span class="text-gray-700 ml-2">{ladderText()}</span>
        </div>
        <div>
          <span class="text-gray-400">天梯积分</span>{' '}
          <span class="text-gray-700 ml-2">{props.pageInfo.ladder_score}</span>
        </div>
        <div>
          <span class="text-gray-400">巅峰排名</span>{' '}
          <span class="text-gray-700 ml-2">{props.peakRank.peak_rank_num || '-'}</span>
        </div>
      </div>
    </div>
  );
}

function RecordRow(props: { record: GameRecord; myUid: string }) {
  const r = props.record;
  const uid = oppUid(r.trans_no, props.myUid);
  const time = fmtTime(r.timestamp);
  const win = r.result === 'Win';
  const lc = r.ladder_score.score_change;
  const pc = r.peak_score.score_change;

  return (
    <div class="flex items-center px-5 py-3 gap-2">
      <img src={r.avatar_url} class="w-12 h-12 rounded-full flex-shrink-0" />
      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-gray-800 truncate">{r.nickname}</div>
        <div class="text-xs text-gray-400">
          UID {uid} · {time}
        </div>
      </div>
      <div class="text-xs text-right flex-shrink-0 space-y-0.5 w-24">
        <div class="text-gray-600">
          {'天梯  '}
          <Show when={!r.ladder_score.is_quite} fallback={<>-</>}>
            {`${r.ladder_score.score} (`}
            <span class={lc >= 0 ? 'text-green-600' : 'text-red-500'}>
              {lc >= 0 ? '+' : ''}
              {lc}
            </span>
            {")"}
          </Show>
        </div>
        <div class="text-gray-600">
          {'巅峰  '}
          <Show when={r.is_init_peak_core} fallback={<>-</>}>
            {`${r.peak_score.score} (`}
            <span class={pc >= 0 ? 'text-green-600' : 'text-red-500'}>
              {pc >= 0 ? '+' : ''}
              {pc}
            </span>
            {")"}
          </Show>
        </div>
      </div>
      <div class="flex-shrink-0 w-12 text-center">
        <span class={`text-lg font-bold ${win ? 'text-green-500' : 'text-red-400'}`}>
          {win ? '胜' : '负'}
        </span>
      </div>
    </div>
  );
}

export function CardPage(props: CardProps) {
  const renderTime = new Date().toLocaleString();
  return (
    <Layout title="七圣召唤 · 个人面板">
      <div id="capture" class="w-[480px] bg-gray-50">
        <div class="bg-gradient-to-r from-amber-500 to-orange-600 h-4" />
        <PlayerCard pageInfo={props.pageInfo} peakRank={props.peakRank} gameUid={props.gameUid} />
        <div class="bg-white mx-4 mb-4 rounded-xl shadow-sm overflow-hidden">
          <div class="px-5 py-3 border-b border-gray-100">
            <h2 class="text-sm font-bold text-gray-700">对局记录</h2>
          </div>
          <div class="divide-y divide-gray-100">
            {props.gameRecords.length > 0 ? (
              props.gameRecords.map((r) => <RecordRow record={r} myUid={props.gameUid} />)
            ) : (
              <div class="text-gray-400 text-center py-8 text-sm">暂无对局记录</div>
            )}
          </div>
        </div>
        <div class="text-center text-xs text-gray-300 pb-4">
          数据来自原神赛事，由 dyebleach 渲染，数据查询时间：{renderTime}
        </div>
      </div>
    </Layout>
  );
}
