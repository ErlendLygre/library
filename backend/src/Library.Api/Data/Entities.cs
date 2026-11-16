using Microsoft.AspNetCore.Identity;

namespace Library.Api.Data;

public class AppUser : IdentityUser
{
    public string DisplayName { get; set; } = "";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class Book
{
    public int Id { get; set; }
    public string Title { get; set; } = "";
    public string Authors { get; set; } = "";
    public string? Isbn { get; set; }
    public int? PublishedYear { get; set; }
    public string? Publisher { get; set; }
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public int? PageCount { get; set; }
    public string? Location { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public string? AddedByUserId { get; set; }
    public AppUser? AddedBy { get; set; }

    public List<Review> Reviews { get; set; } = [];
}

public class Review
{
    public int Id { get; set; }
    public int BookId { get; set; }
    public Book Book { get; set; } = null!;
    public string UserId { get; set; } = "";
    public AppUser User { get; set; } = null!;
    public int Rating { get; set; }
    public string? Text { get; set; }
    public DateOnly? ReadDate { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
