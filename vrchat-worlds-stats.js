// ==UserScript==
// @name         VRChat My Worlds Stats
// @namespace    http://tampermonkey.net/
// @version      5.5
// @description  VRChat My Worldsページに全ワールドの統計情報を表示（非同期読み込み対応）
// @author       Claude Code
// @match        https://vrchat.com/home/content/worlds
// @match        https://vrchat.com/home/content/worlds*
// @icon         https://vrchat.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // console.log('[VRChat Stats] スクリプト開始 v5.4');

    // グローバル変数
    let isProcessing = false;
    let lastUpdateTime = 0;
    let checkInterval = null;

    // メイン処理
    async function addWorldStats(forceUpdate = false) {
        // 処理中の場合はスキップ
        if (isProcessing) {
            return;
        }

        // 強制更新でない場合、既に表示されていればスキップ
        if (!forceUpdate && document.getElementById('vrchat-my-worlds-stats')) {
            return;
        }

        isProcessing = true;

        // My Worldsタイトルを探す
        let titleElement = null;
        const allElements = document.querySelectorAll('h1, h2, h3');
        
        for (let el of allElements) {
            if (el.textContent.trim() === 'My Worlds') {
                titleElement = el;
                // console.log('[VRChat Stats] タイトル要素を発見');
                break;
            }
        }
        
        if (!titleElement) {
            // console.log('[VRChat Stats] My Worldsタイトルが見つかりません');
            isProcessing = false;
            return;
        }

        // 既存の統計表示を取得
        const existingStats = document.getElementById('vrchat-my-worlds-stats');
        
        // 更新中の表示を作成（初回または更新時）
        if (!existingStats || forceUpdate) {
            const refreshingContainer = document.createElement('div');
            refreshingContainer.id = 'vrchat-my-worlds-stats';
            refreshingContainer.style.cssText = `
                background: rgba(23, 28, 33, 0.95);
                border: 2px solid #1c7c8c;
                border-radius: 8px;
                padding: 15px 30px;
                margin: 20px 0;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
                position: relative;
            `;
            refreshingContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #90a4ae;">
                    <div style="font-size: 24px; margin-bottom: 10px;">Refreshing...</div>
                    <div style="font-size: 14px;">Collecting world statistics</div>
                </div>
            `;
            
            if (existingStats) {
                // 更新時：既存の表示を置き換え
                existingStats.parentNode.replaceChild(refreshingContainer, existingStats);
            } else {
                // 初回：タイトルの後に挿入
                titleElement.parentNode.insertBefore(refreshingContainer, titleElement.nextSibling);
            }
        }

        // ワールドデータが完全に読み込まれるまで待機
        // console.log('[VRChat Stats] ワールドデータの読み込みを待機中...');
        const stats = await waitForCompleteWorldData();
        
        if (!stats || stats.worldCount === 0) {
            // console.error('[VRChat Stats] ワールドデータの取得に失敗しました');
            isProcessing = false;
            return;
        }

        // console.log('[VRChat Stats] 最終統計:', stats);
        
        // 統計表示ボックスを作成
        const statsContainer = document.createElement('div');
        statsContainer.id = 'vrchat-my-worlds-stats';
        statsContainer.style.cssText = `
            background: rgba(23, 28, 33, 0.95);
            border: 2px solid #1c7c8c;
            border-radius: 8px;
            padding: 15px 30px;
            margin: 20px 0;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
            position: relative;
        `;

        statsContainer.innerHTML = `
            <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 20px;">
                <div style="text-align: center; flex: 1; min-width: 120px;">
                    <div style="font-size: 36px; font-weight: bold; color: #00b4c6; margin-bottom: 5px;">
                        ${stats.totalUsers.toLocaleString()}
                    </div>
                    <div style="font-size: 13px; color: #90a4ae;">
                        👥 Total Users
                    </div>
                </div>
                <div style="text-align: center; flex: 1; min-width: 120px;">
                    <div style="font-size: 36px; font-weight: bold; color: #00b4c6; margin-bottom: 5px;">
                        ${stats.totalVisits.toLocaleString()}
                    </div>
                    <div style="font-size: 13px; color: #90a4ae;">
                        📊 Total Visits
                    </div>
                </div>
                <div style="text-align: center; flex: 1; min-width: 120px;">
                    <div style="font-size: 36px; font-weight: bold; color: #00b4c6; margin-bottom: 5px;">
                        ${stats.totalFavorites.toLocaleString()}
                    </div>
                    <div style="font-size: 13px; color: #90a4ae;">
                        ⭐ Total Favorites
                    </div>
                </div>
                <div style="text-align: center; flex: 1; min-width: 120px;">
                    <div style="font-size: 36px; font-weight: bold; color: #00b4c6; margin-bottom: 5px;">
                        ${stats.publicWorldCount}
                    </div>
                    <div style="font-size: 13px; color: #90a4ae;">
                        🌍 Worlds (Public)
                    </div>
                </div>
            </div>
            <div style="position: absolute; top: 5px; right: 10px; font-size: 10px; color: #666;">
                Last updated: ${new Date().toLocaleTimeString()}
            </div>
        `;

        // 現在表示されている要素を取得（更新中の表示かもしれない）
        const currentDisplay = document.getElementById('vrchat-my-worlds-stats');
        
        // 既存の表示を新しい表示で置き換え（ちらつき防止）
        if (currentDisplay) {
            currentDisplay.parentNode.replaceChild(statsContainer, currentDisplay);
            // console.log('[VRChat Stats] 統計表示を更新しました');
        } else {
            // タイトルの後に挿入
            titleElement.parentNode.insertBefore(statsContainer, titleElement.nextSibling);
            // console.log('[VRChat Stats] 統計表示を追加しました');
        }
        
        if (stats.privateWorldCount > 0) {
            // console.log(`[VRChat Stats] ${stats.privateWorldCount} private worlds excluded`);
        }

        isProcessing = false;
        lastUpdateTime = Date.now();
    }

    // ワールドデータが完全に読み込まれるまで待機
    async function waitForCompleteWorldData() {
        return new Promise((resolve) => {
            let previousStats = null;
            let stableCount = 0;
            const requiredStableChecks = 2; // 2回連続で同じ結果なら完了とみなす（高速化）
            let attemptCount = 0;
            const maxAttempts = 30; // 最大30秒待機

            const checkData = () => {
                attemptCount++;
                
                if (attemptCount > maxAttempts) {
                    // console.log('[VRChat Stats] タイムアウト：最大待機時間に達しました');
                    resolve(previousStats);
                    return;
                }

                const currentStats = collectWorldStats();
                
                // Publicワールドのうち、Visitsデータが欠けているものをチェック
                const incompleteCards = countIncompleteCards();
                
                // console.log(`[VRChat Stats] チェック ${attemptCount}: ` +
                //           `Public worlds: ${currentStats.publicWorldCount}, ` +
                //           `Incomplete: ${incompleteCards}, ` +
                //           `Total visits: ${currentStats.totalVisits}`);

                // 全てのPublicワールドがデータを持っていて、かつ1つ以上のワールドがある場合は即座に完了
                if (currentStats.publicWorldCount > 0 && incompleteCards === 0) {
                    // console.log('[VRChat Stats] 全データ読み込み完了（即座）');
                    resolve(currentStats);
                    return;
                }

                // 統計が変化していないかチェック
                if (previousStats && 
                    previousStats.totalVisits === currentStats.totalVisits &&
                    previousStats.publicWorldCount === currentStats.publicWorldCount &&
                    incompleteCards === 0) {
                    stableCount++;
                    
                    if (stableCount >= requiredStableChecks) {
                        // console.log('[VRChat Stats] データ読み込み完了（安定）');
                        resolve(currentStats);
                        return;
                    }
                } else {
                    stableCount = 0;
                }

                previousStats = currentStats;
                setTimeout(checkData, 500); // 0.5秒後に再チェック（高速化）
            };

            // 初回は1秒待ってから開始（高速化）
            setTimeout(checkData, 1000);
        });
    }

    // 不完全なカードの数をカウント
    function countIncompleteCards() {
        const worldCards = getWorldCards();
        let incompleteCount = 0;

        worldCards.forEach(card => {
            const cardText = card.innerText || '';
            const isPrivate = cardText.includes('Private\n') || cardText.startsWith('Private');
            
            if (!isPrivate) {
                const hasUsers = cardText.includes('Users In-World');
                const hasVisits = cardText.includes('Visits');
                const hasFavorites = cardText.includes('Favorites');
                
                // PublicワールドでVisitsがない場合は不完全
                if (hasUsers && hasFavorites && !hasVisits) {
                    incompleteCount++;
                }
            }
        });

        return incompleteCount;
    }

    // ワールドカードを取得
    function getWorldCards() {
        const possibleCards = document.querySelectorAll('div');
        const worldCards = [];
        
        possibleCards.forEach(div => {
            const text = div.innerText || '';
            const hasImage = div.querySelector('img');
            const hasStats = text.includes('Users In-World') || text.includes('Visits') || text.includes('Favorites');
            
            if (hasImage && hasStats && div.querySelectorAll('img').length === 1) {
                worldCards.push(div);
            }
        });

        return worldCards;
    }

    // ワールドの統計情報を収集
    function collectWorldStats() {
        const stats = {
            totalUsers: 0,
            totalVisits: 0,
            totalFavorites: 0,
            worldCount: 0,
            publicWorldCount: 0,
            privateWorldCount: 0
        };

        const worldCards = getWorldCards();
        
        worldCards.forEach((card) => {
            const cardText = card.innerText || card.textContent || '';
            
            // プライベートワールドかチェック
            const isPrivate = cardText.includes('Private\n') || cardText.startsWith('Private');
            
            if (isPrivate) {
                stats.privateWorldCount++;
                return;
            }
            
            // 統計情報を抽出
            const lines = cardText.split('\n').map(line => line.trim()).filter(line => line);
            let hasValidData = false;
            
            for (let i = 0; i < lines.length; i++) {
                const currentLine = lines[i];
                const nextLine = lines[i + 1] || '';
                
                if (currentLine === 'Users In-World' && /^\d+$/.test(nextLine)) {
                    stats.totalUsers += parseInt(nextLine);
                    hasValidData = true;
                } else if (currentLine === 'Visits' && /^[\d,]+$/.test(nextLine)) {
                    stats.totalVisits += parseInt(nextLine.replace(/,/g, ''));
                } else if (currentLine === 'Favorites' && /^[\d,]+$/.test(nextLine)) {
                    stats.totalFavorites += parseInt(nextLine.replace(/,/g, ''));
                }
            }
            
            if (hasValidData) {
                stats.worldCount++;
                stats.publicWorldCount++;
            }
        });

        return stats;
    }

    // ページが完全に読み込まれるまで待機してから実行
    function waitAndExecute() {
        // 既存のintervalをクリア
        if (checkInterval) {
            clearInterval(checkInterval);
        }

        // 3秒間隔でチェック（最初の実行は2秒後）
        setTimeout(() => {
            addWorldStats();
            
            // その後も定期的にチェック（新しいワールドが追加された場合に対応）
            checkInterval = setInterval(() => {
                if (!isProcessing) {
                    const currentTime = Date.now();
                    // 最後の更新から60秒以上経過していたら再チェック（1分毎）
                    if (currentTime - lastUpdateTime > 60000) {
                        addWorldStats(true); // 強制更新フラグを使用
                    }
                }
            }, 5000);
        }, 2000);
    }

    // 初期実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', waitAndExecute);
    } else {
        waitAndExecute();
    }

    // URL変更の監視（SPA対応）
    let lastUrl = location.href;
    const urlObserver = new MutationObserver(() => {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            if (currentUrl.includes('/home/content/worlds')) {
                // console.log('[VRChat Stats] URL変更を検出、再実行します');
                isProcessing = false; // リセット
                waitAndExecute();
            }
        }
    });
    
    urlObserver.observe(document.body, { 
        childList: true, 
        subtree: true 
    });

    // console.log('[VRChat Stats] スクリプトの設定が完了しました');
})();