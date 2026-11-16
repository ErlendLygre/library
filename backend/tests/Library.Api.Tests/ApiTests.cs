using System.Net;
using System.Net.Http.Json;
using Library.Api.Endpoints;

namespace Library.Api.Tests;

[Collection(ApiCollection.Name)]
public class ApiTests(LibraryApiFactory factory)
{
    private async Task<HttpClient> LoginAsync(string email, string password)
    {
        var client = factory.CreateClient();
        var res = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, password));
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        return client;
    }

    private Task<HttpClient> LoginAdminAsync() =>
        LoginAsync(LibraryApiFactory.AdminEmail, LibraryApiFactory.AdminPassword);

    private async Task<(HttpClient Client, string Id)> CreateMemberAsync()
    {
        var admin = await LoginAdminAsync();
        var email = $"member-{Guid.NewGuid():N}@test.local";
        var res = await admin.PostAsJsonAsync("/api/users",
            new CreateUserRequest(email, "Member", "member-password-1"));
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var user = await res.Content.ReadFromJsonAsync<UserResponse>();
        return (await LoginAsync(email, "member-password-1"), user!.Id);
    }

    private static async Task<BookDetail> AddBookAsync(HttpClient client, string title = "Dune")
    {
        var res = await client.PostAsJsonAsync("/api/books", new BookRequest(
            title, "Frank Herbert", "978-0441013593", 1965, "Ace", null, null, 412, "Living room"));
        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        return (await res.Content.ReadFromJsonAsync<BookDetail>())!;
    }

    [Fact]
    public async Task Health_check_is_anonymous()
    {
        var res = await factory.CreateClient().GetAsync("/healthz");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task Api_requires_authentication()
    {
        var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/books")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Login_with_wrong_password_fails()
    {
        var res = await factory.CreateClient().PostAsJsonAsync("/api/auth/login",
            new LoginRequest(LibraryApiFactory.AdminEmail, "wrong-password"));
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Seeded_admin_can_log_in_and_log_out()
    {
        var client = await LoginAdminAsync();
        var me = await client.GetFromJsonAsync<MeResponse>("/api/auth/me");
        Assert.True(me!.IsAdmin);

        await client.PostAsync("/api/auth/logout", null);
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Fact]
    public async Task Book_crud_and_search()
    {
        var client = await LoginAdminAsync();
        var title = $"Book {Guid.NewGuid():N}";
        var book = await AddBookAsync(client, title);
        Assert.Equal("9780441013593", book.Isbn);

        var page = await client.GetFromJsonAsync<PagedResult<BookSummary>>(
            $"/api/books?search={Uri.EscapeDataString(title[..12])}");
        Assert.Contains(page!.Items, b => b.Id == book.Id);

        var update = await client.PutAsJsonAsync($"/api/books/{book.Id}", new BookRequest(
            title + " (updated)", "Frank Herbert", null, 1965, null, null, null, null, "Bedroom"));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = await update.Content.ReadFromJsonAsync<BookDetail>();
        Assert.Equal("Bedroom", updated!.Location);

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/books/{book.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/books/{book.Id}")).StatusCode);
    }

    [Fact]
    public async Task Invalid_book_is_rejected()
    {
        var client = await LoginAdminAsync();
        var res = await client.PostAsJsonAsync("/api/books",
            new BookRequest("", null, null, null, null, null, null, null, null));
        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Each_user_has_one_review_per_book()
    {
        var admin = await LoginAdminAsync();
        var (member, _) = await CreateMemberAsync();
        var book = await AddBookAsync(admin);

        Assert.Equal(HttpStatusCode.OK,
            (await member.PutAsJsonAsync($"/api/books/{book.Id}/reviews/me", new ReviewRequest(3, "Ok", null))).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await member.PutAsJsonAsync($"/api/books/{book.Id}/reviews/me", new ReviewRequest(5, "Loved it on re-read", null))).StatusCode);
        Assert.Equal(HttpStatusCode.OK,
            (await admin.PutAsJsonAsync($"/api/books/{book.Id}/reviews/me", new ReviewRequest(4, null, new DateOnly(2024, 5, 1)))).StatusCode);

        var detail = await member.GetFromJsonAsync<BookDetail>($"/api/books/{book.Id}");
        Assert.Equal(2, detail!.Reviews.Count);
        Assert.Equal(4.5, detail.AverageRating);
        Assert.Contains(detail.Reviews, r => r.Rating == 5 && r.Text == "Loved it on re-read");

        var bad = await member.PutAsJsonAsync($"/api/books/{book.Id}/reviews/me", new ReviewRequest(6, null, null));
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);

        Assert.Equal(HttpStatusCode.NoContent, (await member.DeleteAsync($"/api/books/{book.Id}/reviews/me")).StatusCode);
        detail = await member.GetFromJsonAsync<BookDetail>($"/api/books/{book.Id}");
        Assert.Single(detail!.Reviews);
    }

    [Fact]
    public async Task Members_cannot_manage_users_or_delete_others_books()
    {
        var admin = await LoginAdminAsync();
        var (member, _) = await CreateMemberAsync();
        var book = await AddBookAsync(admin);

        Assert.Equal(HttpStatusCode.Forbidden, (await member.GetAsync("/api/users")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.PostAsJsonAsync("/api/users",
            new CreateUserRequest("x@test.local", "X", "password-123"))).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await member.DeleteAsync($"/api/books/{book.Id}")).StatusCode);

        var own = await AddBookAsync(member, "Member's book");
        Assert.True(own.CanEdit);
        Assert.Equal(HttpStatusCode.NoContent, (await member.DeleteAsync($"/api/books/{own.Id}")).StatusCode);
    }

    [Fact]
    public async Task Deleting_a_user_keeps_their_books_but_removes_reviews()
    {
        var admin = await LoginAdminAsync();
        var (member, memberId) = await CreateMemberAsync();
        var book = await AddBookAsync(member, "Orphan book");
        await member.PutAsJsonAsync($"/api/books/{book.Id}/reviews/me", new ReviewRequest(2, null, null));

        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/users/{memberId}")).StatusCode);

        var detail = await admin.GetFromJsonAsync<BookDetail>($"/api/books/{book.Id}");
        Assert.Null(detail!.AddedByUserId);
        Assert.Empty(detail.Reviews);
    }

    [Fact]
    public async Task Unknown_api_route_is_404_not_spa()
    {
        var client = await LoginAdminAsync();
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/does-not-exist")).StatusCode);
    }
}
