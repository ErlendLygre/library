using System.Security.Claims;
using Library.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Library.Api.Endpoints;

public static class ReviewsEndpoints
{
    public static RouteGroupBuilder MapReviewsEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("/books/{bookId:int}/reviews").WithTags("Reviews");

        // Each user has at most one review per book: PUT upserts "my" review.
        group.MapPut("/me", async (int bookId, ReviewRequest req, LibraryDbContext db, ClaimsPrincipal user) =>
        {
            if (!await db.Books.AnyAsync(b => b.Id == bookId)) return Results.NotFound();

            var userId = user.UserId();
            var review = await db.Reviews.Include(r => r.User)
                .FirstOrDefaultAsync(r => r.BookId == bookId && r.UserId == userId);

            if (review is null)
            {
                review = new Review { BookId = bookId, UserId = userId };
                db.Reviews.Add(review);
            }

            review.Rating = req.Rating;
            review.Text = string.IsNullOrWhiteSpace(req.Text) ? null : req.Text.Trim();
            review.ReadDate = req.ReadDate;
            review.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();

            await db.Entry(review).Reference(r => r.User).LoadAsync();
            return Results.Ok(ToResponse(review));
        });

        group.MapDelete("/me", async (int bookId, LibraryDbContext db, ClaimsPrincipal user) =>
        {
            var userId = user.UserId();
            var deleted = await db.Reviews.Where(r => r.BookId == bookId && r.UserId == userId).ExecuteDeleteAsync();
            return deleted == 0 ? Results.NotFound() : Results.NoContent();
        });

        return api;
    }

    public static ReviewResponse ToResponse(Review r) => new(
        r.Id, r.UserId, r.User?.DisplayName ?? "", r.Rating, r.Text, r.ReadDate, r.CreatedAt, r.UpdatedAt);
}
