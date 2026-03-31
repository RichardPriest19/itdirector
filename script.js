// ============================================
// IT DIRECTOR DASHBOARD - SCRIPT
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
    initializeCardAnimations();
    initializeGoToTop();
    initializeArticleCounter();
});

/**
 * Initialize search functionality
 */
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');

    if (!searchInput) return;

    // Create clear search button
    let clearBtn = document.querySelector('.clear-search-btn');
    if (!clearBtn) {
        clearBtn = document.createElement('button');
        clearBtn.className = 'clear-search-btn';
        clearBtn.textContent = '× Back';
        clearBtn.type = 'button';
        searchInput.parentElement.appendChild(clearBtn);
    }

    let suggestionDebounce = null;

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.card');

        // Show/hide clear button
        clearBtn.classList.toggle('visible', searchTerm.length > 0);

        // Cancel any pending AI suggestion call
        clearTimeout(suggestionDebounce);

        // Remove any existing suggestion badges and AI suggestion panel
        document.querySelectorAll('.suggestion-badge').forEach(b => b.remove());
        const existingPanel = document.getElementById('aiSuggestionsPanel');
        if (existingPanel) existingPanel.remove();

        // Reset all cards when search is cleared
        if (searchTerm === '') {
            cards.forEach(card => {
                card.classList.remove('hidden', 'is-suggestion');
                card.style.opacity = '1';
            });
            document.querySelectorAll('.section').forEach(s => s.style.display = '');
            const noResults = document.getElementById('noResults');
            if (noResults) noResults.remove();
            return;
        }

        // Step 1: Separate direct matches from non-matches
        const matchedCards = [];
        const unmatchedCards = [];

        cards.forEach(card => {
            const title       = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const description = card.querySelector('p')?.textContent.toLowerCase() || '';
            const tag         = card.querySelector('.card-tag')?.textContent.toLowerCase() || '';
            const matches     = title.includes(searchTerm) ||
                                description.includes(searchTerm) ||
                                tag.includes(searchTerm);
            (matches ? matchedCards : unmatchedCards).push(card);
        });

        // Step 2: Show only matched cards
        cards.forEach(card => {
            card.classList.remove('hidden', 'is-suggestion');
            if (matchedCards.includes(card)) {
                card.style.opacity = '1';
            } else {
                card.classList.add('hidden');
                card.style.opacity = '0';
            }
        });

        // Step 3: Hide sections with no visible cards
        document.querySelectorAll('.section').forEach(section => {
            const hasVisible = Array.from(section.querySelectorAll('.card'))
                .some(card => !card.classList.contains('hidden'));
            section.style.display = hasVisible ? '' : 'none';
        });

        // Step 4: Show "no results" message if needed
        const visibleCards = document.querySelectorAll('.card:not(.hidden)');
        const noResults = document.getElementById('noResults');
        if (visibleCards.length === 0) {
            if (!noResults) {
                const message = document.createElement('div');
                message.id = 'noResults';
                message.textContent = `No results found for "${searchTerm}"`;
                message.style.cssText = 'text-align: center; padding: 40px; color: var(--text-secondary);';
                document.querySelector('.main-content').appendChild(message);
            }
        } else if (noResults) {
            noResults.remove();
        }

        // Step 5: After a short pause, ask Claude for semantic suggestions
        if (matchedCards.length > 0 && unmatchedCards.length > 0) {
            showSuggestionsLoading();
            suggestionDebounce = setTimeout(() => {
                fetchAISuggestions(searchTerm, matchedCards, unmatchedCards);
            }, 600);
        }
    });

    // Clear search button functionality
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.focus();
    });
}

/**
 * Score how similar two cards are based on tags, section, and shared keywords.
 * Higher score = more related. Threshold of 3 used to filter weak matches.
 */
function getSimilarityScore(sourceCard, targetCard) {
    let score = 0;

    const sourceTag = sourceCard.querySelector('.card-tag')?.textContent.toLowerCase() || '';
    const targetTag = targetCard.querySelector('.card-tag')?.textContent.toLowerCase() || '';

    // Exact tag match is the strongest signal
    if (sourceTag && targetTag && sourceTag === targetTag) score += 4;

    // Same section implies same domain
    if (sourceCard.closest('.section') === targetCard.closest('.section')) score += 2;

    // Shared meaningful words across title + description
    const stopWords = new Set([
        'and', 'the', 'for', 'with', 'from', 'that', 'this', 'are',
        'was', 'not', 'its', 'via', 'over', 'into', 'based', 'using'
    ]);

    const toWords = card =>
        new Set(
            ((card.querySelector('p')?.textContent || '') + ' ' +
             (card.querySelector('h3')?.textContent || ''))
                .toLowerCase()
                .split(/\W+/)
                .filter(w => w.length > 4 && !stopWords.has(w))
        );

    const sourceWords = toWords(sourceCard);
    const targetWords = toWords(targetCard);
    sourceWords.forEach(w => { if (targetWords.has(w)) score++; });

    return score;
}

/**
 * Show a loading placeholder while waiting for AI suggestions
 */
function showSuggestionsLoading() {
    const existing = document.getElementById('aiSuggestionsPanel');
    if (existing) existing.remove();

    const panel = document.createElement('div');
    panel.id = 'aiSuggestionsPanel';
    panel.className = 'suggestions-panel suggestions-loading';
    panel.innerHTML = `
        <h2 class="section-title suggestions-title">
            <span class="suggestions-icon">✦</span>
            You might also be interested in
            <span class="suggestions-loading-dots">
                <span></span><span></span><span></span>
            </span>
        </h2>
        <div class="cards-grid" id="suggestionsGrid"></div>
    `;
    document.querySelector('.main-content').appendChild(panel);
}

/**
 * Ask Claude which unmatched cards are semantically related to the search results
 */
async function fetchAISuggestions(searchTerm, matchedCards, unmatchedCards) {
    const matchedTitles = matchedCards
        .map(c => c.querySelector('h3')?.textContent)
        .filter(Boolean);

    const candidates = unmatchedCards.map((card, i) => ({
        i,
        title:       card.querySelector('h3')?.textContent       || '',
        description: card.querySelector('p')?.textContent        || '',
        tag:         card.querySelector('.card-tag')?.textContent || '',
    }));

    const prompt = `The user searched for "${searchTerm}" on an IT Director dashboard and found: ${matchedTitles.join(', ')}.

From the candidates below, pick up to 5 whose concepts are closely related — complementary tools, overlapping standards, or topics an IT professional would naturally explore alongside the results. Ignore weak or coincidental links.

${candidates.map(c => `${c.i}: "${c.title}" — ${c.description} [${c.tag}]`).join('\n')}

Respond ONLY with a JSON array of index numbers, e.g. [2, 7, 12]. No other text.`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 100,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        const data = await response.json();
        const raw  = (data.content || []).map(b => b.text || '').join('');
        const clean = raw.replace(/```[a-z]*\n?/g, '').trim();
        const indices = JSON.parse(clean);

        const suggested = indices
            .filter(i => Number.isInteger(i) && i >= 0 && i < unmatchedCards.length)
            .map(i => unmatchedCards[i]);

        renderSuggestionsPanel(suggested);
    } catch (err) {
        console.warn('AI suggestions failed, falling back to local scoring:', err);
        renderSuggestionsPanel(getLocalSuggestions(matchedCards, unmatchedCards));
    }
}

/**
 * Local fallback: rank unmatched cards by similarity score to matched cards
 */
function getLocalSuggestions(matchedCards, unmatchedCards) {
    return unmatchedCards
        .map(card => ({
            card,
            score: matchedCards.reduce((sum, mc) => sum + getSimilarityScore(mc, card), 0)
        }))
        .filter(({ score }) => score >= 3)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ card }) => card);
}

/**
 * Render the final suggestions panel with cloned cards
 */
function renderSuggestionsPanel(suggestedCards) {
    const panel = document.getElementById('aiSuggestionsPanel');
    if (!panel) return;

    if (!suggestedCards.length) {
        panel.remove();
        return;
    }

    panel.classList.remove('suggestions-loading');
    panel.querySelector('.suggestions-loading-dots')?.remove();

    const grid = panel.querySelector('#suggestionsGrid');
    grid.innerHTML = '';

    suggestedCards.forEach(card => {
        const clone = card.cloneNode(true);
        clone.classList.remove('hidden', 'is-suggestion');
        clone.style.cssText = 'opacity: 1; animation: fadeInUp 0.4s ease-out forwards;';

        const badge = document.createElement('span');
        badge.className = 'suggestion-badge';
        badge.textContent = 'Related';
        clone.appendChild(badge);

        grid.appendChild(clone);
    });
}

/**
 * Initialize card hover animations
 */
function initializeCardAnimations() {
    const cards = document.querySelectorAll('.card');

    cards.forEach((card, index) => {
        // Stagger animation on page load
        card.style.animationDelay = `${index * 50}ms`;

        // Add smooth hover effect
        card.addEventListener('mouseenter', function() {
            cards.forEach(c => {
                if (c !== this) {
                    c.style.opacity = '0.7';
                }
            });
        });

        card.addEventListener('mouseleave', function() {
            cards.forEach(c => {
                c.style.opacity = '1';
            });
        });
    });
}

/**
 * Initialize go-to-top button functionality
 */
function initializeGoToTop() {
    // Create the button if it doesn't exist
    let goToTopBtn = document.getElementById('goToTopBtn');
    if (!goToTopBtn) {
        goToTopBtn = document.createElement('button');
        goToTopBtn.id = 'goToTopBtn';
        goToTopBtn.innerHTML = '↑ Top';
        goToTopBtn.className = 'go-to-top-btn';
        document.body.appendChild(goToTopBtn);
    }

    // Show/hide button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            goToTopBtn.classList.add('visible');
        } else {
            goToTopBtn.classList.remove('visible');
        }
    });

    // Smooth scroll to top on click
    goToTopBtn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * Smooth scroll functionality
 */
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

/**
 * Copy text to clipboard utility
 */
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy:', err);
    });
}

/**
 * Show temporary notification
 */
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: var(--accent-cyan);
        color: var(--primary-dark);
        padding: 12px 20px;
        border-radius: 6px;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

/**
 * Add CSS animation styles dynamically
 */
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .card {
        animation: fadeInUp 0.6s ease-out forwards;
        opacity: 0;
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    /* ── Suggestions panel ── */
    .suggestions-panel {
        margin-top: 48px;
        padding-top: 32px;
        border-top: 2px dashed rgba(6,182,212,0.25);
        animation: fadeInUp 0.4s ease-out forwards;
    }

    .suggestions-title {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 1.1rem !important;
        opacity: 0.85;
    }

    .suggestions-icon {
        color: var(--accent-cyan, #06b6d4);
        font-size: 1rem;
    }

    /* Loading dots animation */
    .suggestions-loading-dots {
        display: inline-flex;
        gap: 3px;
        margin-left: 4px;
    }

    .suggestions-loading-dots span {
        display: inline-block;
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--accent-cyan, #06b6d4);
        animation: suggestionDot 1.2s infinite ease-in-out;
    }

    .suggestions-loading-dots span:nth-child(2) { animation-delay: 0.2s; }
    .suggestions-loading-dots span:nth-child(3) { animation-delay: 0.4s; }

    @keyframes suggestionDot {
        0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
        40%            { transform: scale(1);   opacity: 1;   }
    }

    /* "Related" badge on suggestion cards */
    .suggestion-badge {
        position: absolute;
        top: 10px;
        right: 10px;
        background: rgba(6,182,212,0.15);
        color: var(--accent-cyan, #06b6d4);
        border: 1px solid rgba(6,182,212,0.4);
        border-radius: 20px;
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        padding: 2px 8px;
        pointer-events: none;
    }
`;
document.head.appendChild(style);

/**
 * Keyboard navigation support
 */
document.addEventListener('keydown', function(e) {
    // Escape to clear search
    if (e.key === 'Escape') {
        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }
    }

    // Focus on search with Cmd/Ctrl + K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
        }
    }
});

/**
 * Dark mode toggle (for future enhancement)
 */
function toggleDarkMode() {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('darkMode', !document.body.classList.contains('light-mode'));
}

// Load saved theme preference
window.addEventListener('load', function() {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'false') {
        document.body.classList.add('light-mode');
    }
});

/**
 * Utility: Format date
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Utility: Get parameter from URL
 */
function getUrlParameter(name) {
    const url = new URL(window.location);
    return url.searchParams.get(name);
}

/**
 * Print optimization
 */
window.addEventListener('beforeprint', function() {
    document.body.style.backgroundColor = 'white';
});

window.addEventListener('afterprint', function() {
    document.body.style.backgroundColor = '';
});

/**
 * Display total article count in the header
 */
function initializeArticleCounter() {
    const total = document.querySelectorAll('.card').length;
    if (!total) return;

    const counter = document.createElement('div');
    counter.id = 'articleCounter';
    counter.innerHTML = `
        <span class="article-counter-number">${total}</span>
        <span class="article-counter-label">articles</span>
    `;

    // Insert after the tagline inside .header-content
    const headerContent = document.querySelector('.header-content');
    if (headerContent) headerContent.appendChild(counter);
}

// Inject article counter styles
const counterStyle = document.createElement('style');
counterStyle.textContent = `
    #articleCounter {
        display: inline-flex;
        align-items: baseline;
        gap: 6px;
        margin-top: 10px;
        background: rgba(6,182,212,0.1);
        border: 1px solid rgba(6,182,212,0.3);
        border-radius: 20px;
        padding: 4px 14px;
    }

    .article-counter-number {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--accent-cyan, #06b6d4);
        letter-spacing: 0.02em;
    }

    .article-counter-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-secondary, #94a3b8);
        text-transform: uppercase;
        letter-spacing: 0.08em;
    }
`;
document.head.appendChild(counterStyle);

// Export functions for use in topic pages
window.ITDashboard = {
    copyToClipboard,
    showNotification,
    scrollToSection,
    toggleDarkMode,
    formatDate,
    getUrlParameter
};
