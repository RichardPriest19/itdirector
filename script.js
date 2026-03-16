// ============================================
// IT DIRECTOR DASHBOARD - SCRIPT
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    initializeSearch();
    initializeCardAnimations();
    initializeGoToTop();
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

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const cards = document.querySelectorAll('.card');

        // Show/hide clear button
        if (searchTerm.length > 0) {
            clearBtn.classList.add('visible');
        } else {
            clearBtn.classList.remove('visible');
        }

        cards.forEach(card => {
            const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const description = card.querySelector('p')?.textContent.toLowerCase() || '';
            const tag = card.querySelector('.card-tag')?.textContent.toLowerCase() || '';

            const matches = title.includes(searchTerm) || 
                           description.includes(searchTerm) || 
                           tag.includes(searchTerm);

            if (searchTerm === '') {
                card.classList.remove('hidden');
                card.style.opacity = '1';
            } else if (matches) {
                card.classList.remove('hidden');
                card.style.opacity = '1';
            } else {
                card.classList.add('hidden');
                card.style.opacity = '0.2';
            }
        });

        // Show "no results" message if needed
        const visibleCards = document.querySelectorAll('.card:not(.hidden)');
        const noResults = document.getElementById('noResults');
        
        if (visibleCards.length === 0 && searchTerm !== '') {
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
    });

    // Clear search button functionality
    clearBtn.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.focus();
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

// Export functions for use in topic pages
window.ITDashboard = {
    copyToClipboard,
    showNotification,
    scrollToSection,
    toggleDarkMode,
    formatDate,
    getUrlParameter
};
