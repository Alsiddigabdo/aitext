// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('nav');
    if (window.scrollY > 10) {
        navbar.classList.add('py-2', 'shadow-md');
        navbar.classList.remove('py-4');
    } else {
        navbar.classList.remove('py-2', 'shadow-md');
        navbar.classList.add('py-4');
    }
});

// Mobile menu toggle
const menuToggle = document.getElementById('menu-toggle');
const mobileMenu = document.getElementById('mobile-menu');
menuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Theme toggle
const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.querySelectorAll('[id^="theme-toggle"] i').forEach(icon => {
        icon.classList.toggle('ri-sun-line', !isDark);
        icon.classList.toggle('ri-moon-line', isDark);
    });
};
document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('theme-toggle-mobile').addEventListener('click', toggleTheme);

// Check system preference and stored theme
if (localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    document.querySelectorAll('[id^="theme-toggle"] i').forEach(icon => {
        icon.classList.remove('ri-sun-line');
        icon.classList.add('ri-moon-line');
    });
}