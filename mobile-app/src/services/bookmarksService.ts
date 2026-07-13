import api from './api';

const bookmarksService = {
  getAll: () =>
    api.get<{ data: any[] }>('/bookmarks'),

  add: (insightId: string) =>
    api.post<{ message: string }>(`/bookmarks/${insightId}`),

  remove: (insightId: string) =>
    api.delete<{ message: string }>(`/bookmarks/${insightId}`),

  isBookmarked: (insightId: string) =>
    api.get<{ data: { bookmarked: boolean } }>(`/bookmarks/${insightId}/status`),
};

export default bookmarksService;
