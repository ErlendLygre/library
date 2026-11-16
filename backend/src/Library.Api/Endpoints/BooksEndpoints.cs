using System.Security.Claims;
using Library.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Library.Api.Endpoints;

public static class BooksEndpoints
{
    public static RouteGroupBuilder MapBooksEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("/books").WithTags("Books");

        group.MapGet("/", async (LibraryDbContext db, string? search, string? sort, int page = 1, int pageSize = 24) =>
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = db.Books.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var pattern = $"%{EscapeLike(search.Trim())}%";
                query = query.Where(b =>
                    EF.Functions.ILike(b.Title, pattern, "\\") ||
                    EF.Functions.ILike(b.Authors, pattern, "\\") ||
                    (b.Isbn != null && EF.Functions.ILike(b.Isbn, pattern, "\\")) ||
                    (b.Location != null && EF.Functions.ILike(b.Location, pattern, "\\")));
            }

            query = sort switch
            {
                "author" => query.OrderBy(b => b.Authors).ThenBy(b => b.Title),
                "year" => query.OrderByDescending(b => b.PublishedYear).ThenBy(b => b.Title),
                "rating" => query.OrderByDescending(b => b.Reviews.Average(r => (double?)r.Rating) ?? 0).ThenBy(b => b.Title),
                "added" => query.OrderByDescending(b => b.CreatedAt),
                _ => query.OrderBy(b => b.Title),
            };

            var total = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new BookSummary(
                    b.Id, b.Title, b.Authors, b.Isbn, b.PublishedYear, b.CoverUrl, b.Location,
                    b.Reviews.Average(r => (double?)r.Rating),
                    b.Reviews.Count,
                    b.CreatedAt))
                .ToListAsync();

            return new PagedResult<BookSummary>(items, total, page, pageSize);
        });

        group.MapGet("/{id:int}", async (int id, LibraryDbContext db, ClaimsPrincipal user) =>
        {
            var book = await db.Books.AsNoTracking()
                .Include(b => b.AddedBy)
                .Include(b => b.Reviews).ThenInclude(r => r.User)
                .FirstOrDefaultAsync(b => b.Id == id);

            return book is null ? Results.NotFound() : Results.Ok(ToDetail(book, user));
        }).WithName("GetBook");

        group.MapPost("/", async (BookRequest req, LibraryDbContext db, ClaimsPrincipal user) =>
        {
            var book = new Book { AddedByUserId = user.UserId() };
            Apply(book, req);
            db.Books.Add(book);
            await db.SaveChangesAsync();
            return Results.CreatedAtRoute("GetBook", new { id = book.Id }, ToDetail(book, user));
        });

        group.MapPut("/{id:int}", async (int id, BookRequest req, LibraryDbContext db, ClaimsPrincipal user) =>
        {
            var book = await db.Books.Include(b => b.Reviews).ThenInclude(r => r.User)
                .Include(b => b.AddedBy)
                .FirstOrDefaultAsync(b => b.Id == id);
            if (book is null) return Results.NotFound();

            // Shared household library: any signed-in user can fix book details.
            Apply(book, req);
            book.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return Results.Ok(ToDetail(book, user));
        });

        group.MapDelete("/{id:int}", async (int id, LibraryDbContext db, ClaimsPrincipal user) =>
        {
            var book = await db.Books.FindAsync(id);
            if (book is null) return Results.NotFound();
            if (!CanDelete(book, user)) return Results.Forbid();

            db.Books.Remove(book);
            await db.SaveChangesAsync();
            return Results.NoContent();
        });

        return api;
    }

    private static bool CanDelete(Book book, ClaimsPrincipal user) =>
        user.IsAdmin() || book.AddedByUserId == user.UserId();

    private static void Apply(Book book, BookRequest req)
    {
        book.Title = req.Title.Trim();
        book.Authors = req.Authors?.Trim() ?? "";
        book.Isbn = NullIfEmpty(req.Isbn?.Replace("-", "").Replace(" ", ""));
        book.PublishedYear = req.PublishedYear;
        book.Publisher = NullIfEmpty(req.Publisher);
        book.Description = NullIfEmpty(req.Description);
        book.CoverUrl = NullIfEmpty(req.CoverUrl);
        book.PageCount = req.PageCount;
        book.Location = NullIfEmpty(req.Location);
    }

    private static string? NullIfEmpty(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();

    private static string EscapeLike(string s) =>
        s.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    private static BookDetail ToDetail(Book b, ClaimsPrincipal user) => new(
        b.Id, b.Title, b.Authors, b.Isbn, b.PublishedYear, b.Publisher, b.Description, b.CoverUrl,
        b.PageCount, b.Location, b.CreatedAt, b.UpdatedAt,
        b.AddedByUserId, b.AddedBy?.DisplayName,
        CanDelete(b, user),
        b.Reviews.Count > 0 ? b.Reviews.Average(r => r.Rating) : null,
        b.Reviews
            .OrderByDescending(r => r.UpdatedAt)
            .Select(ReviewsEndpoints.ToResponse)
            .ToList());
}
