<script>
  export let profile;
  export let isSelected = false;
  export let onSelect = () => {};
  export let showCheckbox = true;
  export let statusTag = null;

  function handleSelect() {
    onSelect(profile);
  }

  function getAvatarUrl(profile) {
    if (profile.avatar) {
      return profile.avatar;
    }
    // Fallback to a default avatar or initials
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || profile.handle)}&background=6366f1&color=fff&size=64`;
  }
</script>

<div class="profile-card bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200">
  <div class="flex items-start space-x-3">
    <!-- Profile Picture -->
    <div class="flex-shrink-0">
      <img
        src={getAvatarUrl(profile)}
        alt="{profile.displayName || profile.handle}"
        class="w-12 h-12 rounded-full object-cover border-2 border-gray-100"
        onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || profile.handle)}&background=6366f1&color=fff&size=64'"
      />
    </div>

    <!-- Profile Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center space-x-2 mb-1">
        <!-- Name -->
        <h3 class="text-base font-semibold text-gray-900 truncate">
          {profile.displayName || profile.handle}
        </h3>

        <!-- Handle -->
        <span class="text-sm text-gray-600 truncate">
          @{profile.handle}
        </span>

        <!-- Status Tag -->
        {#if statusTag}
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {statusTag}
          </span>
        {/if}
      </div>

      <!-- Description -->
      {#if profile.description}
        <p class="text-sm text-gray-700 line-clamp-2 mb-3">
          {profile.description}
        </p>
      {/if}

      <!-- Selection Checkbox -->
      {#if showCheckbox}
        <div class="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={isSelected}
            on:change={handleSelect}
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <span class="text-sm text-gray-600">Select to add to list</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>