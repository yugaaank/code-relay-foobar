async function testRegister() {
    const username = `user_${Date.now()}`;
    const email = `test_${Date.now()}@example.com`;
    const password = 'password123';

    console.log(`Attempting to register user: ${username} (${email})`);

    try {
        const response = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Registration SUCCESS!');
            console.log('User ID:', data.user.id);
            console.log('Token:', data.token ? 'Received' : 'Missing');
        } else {
            console.error('Registration FAILED');
            console.error('Status:', response.status);
            console.error('Data:', data);
        }
    } catch (error) {
        console.error('Registration FAILED (Likely network error or server down)');
        console.error('Error:', error.message);
    }
}

testRegister();
