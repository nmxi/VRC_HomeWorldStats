// ==UserScript==
// @name         VRChat Worlds Stats
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  VRChat My WorldsページとUserページに全ワールドの統計情報を表示
// @author       mikinel
// @match        https://vrchat.com/*
// @icon         https://vrchat.com/favicon.ico
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // ==================== Configuration ====================
    const CONFIG = {
        UPDATE_INTERVAL: 10000,     // 10 seconds
        CHECK_INTERVAL: 5000,       // 5 seconds
        INITIAL_DELAY: 2000,        // 2 seconds
        DATA_CHECK_DELAY: 1000,     // 1 second
        DATA_CHECK_INTERVAL: 500,   // 0.5 seconds
        MAX_WAIT_ATTEMPTS: 30,      // 30 attempts max
        REQUIRED_STABLE_CHECKS: 2,  // 2 consecutive checks
        CONTAINER_ID: 'vrchat-my-worlds-stats',
        MAX_CARD_TEXT_LENGTH: 200   // Maximum text length for world cards
    };

    // ==================== Styles ====================
    const STYLES = {
        container: `
            background: rgba(23, 28, 33, 0.95);
            border: 2px solid #1c7c8c;
            border-radius: 8px;
            padding: 15px 30px;
            margin: 20px 0;
            color: white;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
            position: relative;
        `,
        statsRow: `
            display: flex;
            justify-content: space-around;
            align-items: center;
            flex-wrap: wrap;
            gap: 20px;
            height: 72px;
        `,
        statBox: `
            text-align: center;
            flex: 1;
            min-width: 120px;
        `,
        statValue: `
            font-size: 36px;
            font-weight: bold;
            color: #00b4c6;
            line-height: 1;
        `,
        statLabel: `
            font-size: 13px;
            color: #90a4ae;
            margin-top: 2px;
        `,
        refreshingBox: `
            text-align: center;
            margin: auto;
        `,
        refreshingText: `
            font-size: 24px;
            color: #90a4ae;
        `,
        refreshingSubtext: `
            font-size: 14px;
            color: #90a4ae;
            margin-top: 5px;
        `,
        disclaimer: `
            position: absolute;
            top: 5px;
            left: 10px;
            font-size: 11px;
            color: #666;
        `
    };

    // ==================== State Management ====================
    class StatsManager {
        constructor() {
            this.isProcessing = false;
            this.lastUpdateTime = 0;
            this.checkInterval = null;
        }

        reset() {
            this.isProcessing = false;
            if (this.checkInterval) {
                clearInterval(this.checkInterval);
                this.checkInterval = null;
            }
        }
    }

    const statsManager = new StatsManager();

    // ==================== Utility Functions ====================
    const Utils = {
        isWorldsPage() {
            return location.href.includes('/home/content/worlds');
        },

        isUserProfilePage() {
            return location.href.includes('/home/user/usr_');
        },

        isTargetPage() {
            return this.isWorldsPage() || this.isUserProfilePage();
        },

        findTitleElement() {
            const allElements = document.querySelectorAll('h1, h2, h3');
            
            for (let el of allElements) {
                const text = el.textContent.trim();
                if (text === 'My Worlds' || text.endsWith("'s Worlds")) {
                    return el;
                }
            }
            return null;
        },

        getExistingStatsElement() {
            return document.getElementById(CONFIG.CONTAINER_ID);
        },

        createStatsHTML(stats) {
            const hasVisitsData = stats.hasVisitsData;
            
            return `
                <div style="${STYLES.statsRow}">
                    ${this.createStatBox('👥 Total Users In-Worlds', stats.totalUsers)}
                    ${hasVisitsData ? this.createStatBox('📈 Total Visits', stats.totalVisits) : ''}
                    ${this.createStatBox('⭐ Total Favorites', stats.totalFavorites)}
                    ${this.createStatBox('🌍 Worlds (Public)', stats.publicWorldCount)}
                </div>
                <div style="${STYLES.disclaimer}">
                    ※ VRChat Homeで表示される各数値は概算であるため、誤差が生じることがあります。
                </div>
            `;
        },

        createStatBox(label, value) {
            return `
                <div style="${STYLES.statBox}">
                    <div style="${STYLES.statValue}">
                        ${typeof value === 'number' ? value.toLocaleString() : value}
                    </div>
                    <div style="${STYLES.statLabel}">
                        ${label}
                    </div>
                </div>
            `;
        },

        createRefreshingHTML() {
            return `
                <div style="${STYLES.statsRow}">
                    <div style="${STYLES.refreshingBox}">
                        <div style="${STYLES.refreshingText}">Refreshing...</div>
                        <div style="${STYLES.refreshingSubtext}">Collecting world statistics</div>
                    </div>
                </div>
            `;
        }
    };

    // ==================== World Data Collection ====================
    class WorldDataCollector {
        getWorldCards() {
            const possibleCards = document.querySelectorAll('div');
            const worldCards = [];
            const seenWorlds = new Set();
            
            possibleCards.forEach(div => {
                if (this.isValidWorldCard(div)) {
                    const worldName = this.extractWorldName(div);
                    if (worldName && !seenWorlds.has(worldName)) {
                        seenWorlds.add(worldName);
                        worldCards.push(div);
                    }
                }
            });

            return worldCards;
        }

        isValidWorldCard(div) {
            const text = div.innerText || '';
            const hasImage = div.querySelector('img');
            const hasStats = text.includes('Users In-World') || 
                           text.includes('Visits') || 
                           text.includes('Favorites');
            const imageCount = div.querySelectorAll('img').length;
            
            // セクションヘッダーを除外（"'s Worlds"を含むもの）
            const isSectionHeader = text.includes("'s Worlds") || text.includes("My Worlds");
            
            // ワールドカードは特定のクラスまたは構造を持つ
            // Last Updatedを含むことでより正確に判定
            const hasLastUpdated = text.includes('Last Updated');
            
            return hasImage && 
                   hasStats && 
                   hasLastUpdated &&
                   imageCount === 1 && 
                   text.length < CONFIG.MAX_CARD_TEXT_LENGTH &&
                   !isSectionHeader;
        }

        extractWorldName(card) {
            const text = card.innerText || '';
            const lines = text.split('\n').filter(line => line.trim());
            return lines[0] || '';
        }

        collectWorldStats() {
            const stats = {
                totalUsers: 0,
                totalVisits: 0,
                totalFavorites: 0,
                worldCount: 0,
                publicWorldCount: 0,
                privateWorldCount: 0,
                hasVisitsData: false
            };

            const worldCards = this.getWorldCards();
            
            worldCards.forEach(card => {
                this.processWorldCard(card, stats);
            });

            return stats;
        }

        processWorldCard(card, stats) {
            const cardText = card.innerText || card.textContent || '';
            const lines = cardText.split('\n')
                                .map(line => line.trim())
                                .filter(line => line);
            
            const isPrivate = lines.some(line => line === 'Private');
            
            if (isPrivate) {
                stats.privateWorldCount++;
                return;
            }

            let hasValidData = false;
            
            for (let i = 0; i < lines.length; i++) {
                const currentLine = lines[i];
                const nextLine = lines[i + 1] || '';
                
                if (currentLine === 'Users In-World' && /^\d+$/.test(nextLine)) {
                    stats.totalUsers += parseInt(nextLine);
                    hasValidData = true;
                } else if (currentLine === 'Visits' && /^[\d,]+$/.test(nextLine)) {
                    stats.totalVisits += parseInt(nextLine.replace(/,/g, ''));
                    stats.hasVisitsData = true;
                } else if (currentLine === 'Favorites' && /^[\d,]+$/.test(nextLine)) {
                    stats.totalFavorites += parseInt(nextLine.replace(/,/g, ''));
                }
            }
            
            if (hasValidData) {
                stats.worldCount++;
                stats.publicWorldCount++;
            }
        }

        countIncompleteCards() {
            const worldCards = this.getWorldCards();
            let incompleteCount = 0;

            worldCards.forEach(card => {
                const cardText = card.innerText || '';
                const isPrivate = cardText.includes('Private\n') || 
                                cardText.startsWith('Private');
                
                if (!isPrivate) {
                    const hasUsers = cardText.includes('Users In-World');
                    const hasVisits = cardText.includes('Visits');
                    const hasFavorites = cardText.includes('Favorites');
                    
                    if (hasUsers && hasFavorites && !hasVisits) {
                        incompleteCount++;
                    }
                }
            });

            return incompleteCount;
        }
    }

    // ==================== Stats Display ====================
    class StatsDisplay {
        constructor(dataCollector) {
            this.dataCollector = dataCollector;
        }

        async addWorldStats(forceUpdate = false) {
            if (statsManager.isProcessing) {
                return;
            }

            if (!forceUpdate && Utils.getExistingStatsElement()) {
                return;
            }

            statsManager.isProcessing = true;

            const titleElement = Utils.findTitleElement();
            if (!titleElement) {
                statsManager.isProcessing = false;
                return;
            }

            this.showRefreshingState(titleElement, forceUpdate);

            const stats = await this.waitForCompleteWorldData();
            
            if (!stats || stats.worldCount === 0) {
                statsManager.isProcessing = false;
                return;
            }

            this.displayStats(titleElement, stats);

            statsManager.isProcessing = false;
            statsManager.lastUpdateTime = Date.now();
        }

        showRefreshingState(titleElement, forceUpdate) {
            const existingStats = Utils.getExistingStatsElement();
            
            if (!existingStats && !forceUpdate) {
                const refreshingContainer = this.createContainer();
                refreshingContainer.innerHTML = Utils.createRefreshingHTML();
                titleElement.parentNode.insertBefore(refreshingContainer, titleElement.nextSibling);
            }
        }

        createContainer() {
            const container = document.createElement('div');
            container.id = CONFIG.CONTAINER_ID;
            container.style.cssText = STYLES.container;
            return container;
        }

        displayStats(titleElement, stats) {
            const statsContainer = this.createContainer();
            statsContainer.innerHTML = Utils.createStatsHTML(stats);

            const currentDisplay = Utils.getExistingStatsElement();
            
            if (currentDisplay) {
                currentDisplay.parentNode.replaceChild(statsContainer, currentDisplay);
            } else {
                titleElement.parentNode.insertBefore(statsContainer, titleElement.nextSibling);
            }
        }

        async waitForCompleteWorldData() {
            return new Promise((resolve) => {
                let previousStats = null;
                let stableCount = 0;
                let attemptCount = 0;

                const checkData = () => {
                    attemptCount++;
                    
                    if (attemptCount > CONFIG.MAX_WAIT_ATTEMPTS) {
                        resolve(previousStats);
                        return;
                    }

                    const currentStats = this.dataCollector.collectWorldStats();
                    const incompleteCards = this.dataCollector.countIncompleteCards();
                    const isUserProfilePage = Utils.isUserProfilePage();
                    
                    if (currentStats.publicWorldCount > 0 && (isUserProfilePage || incompleteCards === 0)) {
                        resolve(currentStats);
                        return;
                    }

                    if (this.isDataStable(previousStats, currentStats, incompleteCards)) {
                        stableCount++;
                        
                        if (stableCount >= CONFIG.REQUIRED_STABLE_CHECKS) {
                            resolve(currentStats);
                            return;
                        }
                    } else {
                        stableCount = 0;
                    }

                    previousStats = currentStats;
                    setTimeout(checkData, CONFIG.DATA_CHECK_INTERVAL);
                };

                setTimeout(checkData, CONFIG.DATA_CHECK_DELAY);
            });
        }

        isDataStable(previousStats, currentStats, incompleteCards) {
            return previousStats && 
                   previousStats.totalVisits === currentStats.totalVisits &&
                   previousStats.publicWorldCount === currentStats.publicWorldCount &&
                   incompleteCards === 0;
        }
    }

    // ==================== Main Application ====================
    class VRChatWorldsStats {
        constructor() {
            this.dataCollector = new WorldDataCollector();
            this.statsDisplay = new StatsDisplay(this.dataCollector);
            this.lastUrl = location.href;
        }

        initialize() {
            this.setupEventListeners();
            this.checkAndExecute();
        }

        setupEventListeners() {
            // DOMContentLoaded
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.checkAndExecute());
            }

            // History API overrides
            this.overrideHistoryMethods();

            // Popstate event
            window.addEventListener('popstate', () => {
                setTimeout(() => this.checkAndExecute(), 100);
            });

            // MutationObserver as backup
            this.setupMutationObserver();
        }

        overrideHistoryMethods() {
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            
            history.pushState = (...args) => {
                originalPushState.apply(history, args);
                setTimeout(() => this.checkAndExecute(), 100);
            };
            
            history.replaceState = (...args) => {
                originalReplaceState.apply(history, args);
                setTimeout(() => this.checkAndExecute(), 100);
            };
        }

        setupMutationObserver() {
            const urlObserver = new MutationObserver(() => {
                const currentUrl = location.href;
                if (currentUrl !== this.lastUrl) {
                    this.lastUrl = currentUrl;
                    this.checkAndExecute();
                }
            });
            
            urlObserver.observe(document.body, { 
                childList: true, 
                subtree: true 
            });
        }

        checkAndExecute() {
            if (Utils.isTargetPage()) {
                statsManager.reset();
                this.waitAndExecute();
            }
        }

        waitAndExecute() {
            setTimeout(() => {
                this.statsDisplay.addWorldStats();
                this.setupUpdateInterval();
            }, CONFIG.INITIAL_DELAY);
        }

        setupUpdateInterval() {
            statsManager.checkInterval = setInterval(() => {
                if (!statsManager.isProcessing) {
                    const currentTime = Date.now();
                    if (currentTime - statsManager.lastUpdateTime > CONFIG.UPDATE_INTERVAL) {
                        this.statsDisplay.addWorldStats(true);
                    }
                }
            }, CONFIG.CHECK_INTERVAL);
        }
    }

    // ==================== Initialize Application ====================
    const app = new VRChatWorldsStats();
    app.initialize();

})();