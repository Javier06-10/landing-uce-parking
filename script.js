document.addEventListener('DOMContentLoaded', () => {
    // 1. Scroll Reveal Animation
    const revealElements = document.querySelectorAll('.reveal');
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                // Optional: stop observing once revealed
                // revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // 2. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 3. Subscription Payment Logic
    const planButtons = document.querySelectorAll('.btn-plan');
    
    planButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const planId = e.currentTarget.getAttribute('data-plan-id');
            const originalText = e.currentTarget.innerText;
            
            // Visual feedback
            e.currentTarget.disabled = true;
            e.currentTarget.innerText = 'Procesando...';
            
            try {
                // Assuming the backend is on the same host or you have a defined API URL
                // Replace 'http://localhost:3000' with your actual backend URL if needed
                const response = await fetch('/api/subscriptions/create-session', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        planId: parseInt(planId),
                        // You might need to pass organizationId or get it from context/auth
                        organizacionId: 1 // Default or from session
                    })
                });

                const data = await response.json();

                if (data.url) {
                    // Redirect to Stripe Checkout
                    window.location.href = data.url;
                } else {
                    throw new Error(data.error || 'Error al iniciar sesión de pago');
                }
            } catch (error) {
                console.error('Payment Error:', error);
                alert('No se pudo iniciar el proceso de pago. Por favor, intenta de nuevo.');
                
                // Reset button
                e.currentTarget.disabled = false;
                e.currentTarget.innerText = originalText;
            }
        });
    });

    // 4. Smooth Anchor Scrolling (Fallback)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if(href === '#') return;
            
            e.preventDefault();
            document.querySelector(href).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});
