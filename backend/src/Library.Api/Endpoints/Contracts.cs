using System.ComponentModel.DataAnnotations;

namespace Library.Api.Endpoints;

// ---- Auth ----
public record LoginRequest([Required, EmailAddress] string Email, [Required] string Password);

public record ChangePasswordRequest(
    [Required] string CurrentPassword,
    [Required, MinLength(8)] string NewPassword);

public record MeResponse(string Id, string Email, string DisplayName, bool IsAdmin);

// ---- Users ----
public record UserResponse(string Id, string Email, string DisplayName, bool IsAdmin, DateTimeOffset CreatedAt);

public record CreateUserRequest(
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MaxLength(100)] string DisplayName,
    [Required, MinLength(8)] string Password,
    bool IsAdmin = false);

// ---- Books ----
public record BookRequest(
    [Required, MaxLength(500)] string Title,
    [MaxLength(500)] string? Authors,
    [MaxLength(20)] string? Isbn,
    [Range(0, 3000)] int? PublishedYear,
    [MaxLength(200)] string? Publisher,
    [MaxLength(10_000)] string? Description,
    [MaxLength(1000), Url] string? CoverUrl,
    [Range(1, 100_000)] int? PageCount,
    [MaxLength(200)] string? Location);

public record BookSummary(
    int Id,
    string Title,
    string Authors,
    string? Isbn,
    int? PublishedYear,
    string? CoverUrl,
    string? Location,
    double? AverageRating,
    int ReviewCount,
    DateTimeOffset CreatedAt);

public record BookDetail(
    int Id,
    string Title,
    string Authors,
    string? Isbn,
    int? PublishedYear,
    string? Publisher,
    string? Description,
    string? CoverUrl,
    int? PageCount,
    string? Location,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    string? AddedByUserId,
    string? AddedByName,
    bool CanEdit,
    double? AverageRating,
    IReadOnlyList<ReviewResponse> Reviews);

public record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize);

// ---- Reviews ----
public record ReviewRequest(
    [Range(1, 5)] int Rating,
    [MaxLength(20_000)] string? Text,
    DateOnly? ReadDate);

public record ReviewResponse(
    int Id,
    string UserId,
    string UserName,
    int Rating,
    string? Text,
    DateOnly? ReadDate,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

// ---- Lookup ----
public record IsbnLookupResponse(
    string Isbn,
    string? Title,
    string? Authors,
    string? Publisher,
    int? PublishedYear,
    int? PageCount,
    string? CoverUrl,
    string? Description);
