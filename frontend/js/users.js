document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  initAutoLogout();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user.isAdmin) {
    alert('Admin access required.');
    window.location.href = '/dashboard';
    return;
  }

  document.getElementById('create-user-form').addEventListener('submit', createUser);
  await Promise.all([loadUsers(), loadLogs()]);
});

async function loadUsers() {
  const container = document.getElementById('users-table-container');
  try {
    const users = await api.getUsers();
    if (!users.length) {
      container.innerHTML = '<p>No users found.</p>';
      return;
    }

    const currentUserId = JSON.parse(localStorage.getItem('user') || '{}').id;

    const rows = users.map(u => {
      const isSelf = u.id === currentUserId;
      const roleBadge = u.role === 'admin' ? '👑 Admin' : '👤 Regular';
      let actions = '';

      if (!isSelf) {
        // Activate / Deactivate
        if (u.active) {
          actions += `<button class="btn btn-small btn-delete" style="margin-right:4px;" onclick="deactivateUser(${u.id})">Deactivate</button>`;
        } else {
          actions += `<button class="btn btn-small btn-edit" style="margin-right:4px;" onclick="activateUser(${u.id})">Activate</button>`;
        }
        // Promote / Demote
        if (u.role === 'admin') {
          actions += `<button class="btn btn-small btn-delete" style="margin-right:4px;" onclick="demoteUser(${u.id})">Demote</button>`;
        } else {
          actions += `<button class="btn btn-small btn-edit" style="margin-right:4px;" onclick="promoteUser(${u.id})">Promote</button>`;
        }
        actions += `<button class="btn btn-small btn-edit" style="margin-right:4px;" onclick="promptResetPassword(${u.id})">Reset Pwd</button>`;
        actions += `<button class="btn btn-small btn-delete" onclick="removeUser(${u.id})">Delete</button>`;
      } else {
        actions = '<span class="text-xs text-gray-400">You</span>';
      }

      return `
        <tr class="border-b">
          <td class="px-3 py-2">${u.name || '-'}</td>
          <td class="px-3 py-2">${u.email}</td>
          <td class="px-3 py-2">${roleBadge}</td>
          <td class="px-3 py-2">${u.active ? '✅ Active' : '⏳ Inactive'}</td>
          <td class="px-3 py-2">${u.last_login ? new Date(u.last_login).toLocaleString() : '-'}</td>
          <td class="px-3 py-2">${new Date(u.created_at).toLocaleString()}</td>
          <td class="px-3 py-2 space-x-2">${actions}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <table class="entries-table w-full">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Created</th><th>Actions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch (error) {
    container.innerHTML = `<p class="text-red-600">${error.message}</p>`;
  }
}

async function loadLogs() {
  const container = document.getElementById('logs-container');
  try {
    const logs = await api.getActivityLogs();
    if (!logs.length) {
      container.innerHTML = '<p>No activity logs available.</p>';
      return;
    }
    const rows = logs.slice(0, 100).map(log => `
      <tr class="border-b">
        <td class="px-3 py-2">${log.actor_email}</td>
        <td class="px-3 py-2">${log.activity_type}</td>
        <td class="px-3 py-2">${log.description || '-'}</td>
        <td class="px-3 py-2">${new Date(log.created_at).toLocaleString()}</td>
      </tr>`).join('');
    container.innerHTML = `
      <table class="entries-table w-full">
        <thead><tr><th>Actor</th><th>Type</th><th>Description</th><th>When</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  } catch (error) {
    container.innerHTML = `<p class="text-red-600">${error.message}</p>`;
  }
}

async function createUser(e) {
  e.preventDefault();
  const name = document.getElementById('new-user-name').value;
  const email = document.getElementById('new-user-email').value;
  const password = document.getElementById('new-user-password').value;
  try {
    await api.createUser(name, email, password);
    e.target.reset();
    await Promise.all([loadUsers(), loadLogs()]);
    alert('User created.');
  } catch (error) {
    alert(error.message);
  }
}

async function promptResetPassword(userId) {
  const pwd = prompt('Enter new password (min 6 chars):');
  if (!pwd) return;
  try {
    await api.updateUserPassword(userId, pwd);
    await loadLogs();
    alert('Password updated.');
  } catch (error) {
    alert(error.message);
  }
}

async function activateUser(userId) {
  try {
    await api.activateUser(userId);
    await Promise.all([loadUsers(), loadLogs()]);
    alert('User activated.');
  } catch (error) {
    alert(error.message);
  }
}

async function deactivateUser(userId) {
  try {
    await api.deactivateUser(userId);
    await Promise.all([loadUsers(), loadLogs()]);
    alert('User deactivated.');
  } catch (error) {
    alert(error.message);
  }
}

async function promoteUser(userId) {
  try {
    await api.promoteUser(userId);
    await Promise.all([loadUsers(), loadLogs()]);
    alert('User promoted to admin.');
  } catch (error) {
    alert(error.message);
  }
}

async function demoteUser(userId) {
  try {
    await api.demoteUser(userId);
    await Promise.all([loadUsers(), loadLogs()]);
    alert('User demoted to regular.');
  } catch (error) {
    alert(error.message);
  }
}

async function removeUser(userId) {
  if (!confirm('Delete this user?')) return;
  try {
    await api.deleteUser(userId);
    await Promise.all([loadUsers(), loadLogs()]);
    alert('User deleted.');
  } catch (error) {
    alert(error.message);
  }
}