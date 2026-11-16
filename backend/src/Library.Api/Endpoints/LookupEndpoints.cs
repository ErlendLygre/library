using System.Text.Json;
using System.Text.RegularExpressions;

namespace Library.Api.Endpoints;

/// <summary>Looks up book metadata by ISBN using the free Open Library API.</summary>
public static partial class LookupEndpoints
{
    public const string HttpClientName = "openlibrary";

    [GeneratedRegex(@"^(\d{9}[\dX]|\d{13})$")]
    private static partial Regex IsbnRegex();

    [GeneratedRegex(@"\b(\d{4})\b")]
    private static partial Regex YearRegex();

    public static RouteGroupBuilder MapLookupEndpoints(this RouteGroupBuilder api)
    {
        api.MapGet("/lookup/isbn/{isbn}", async (string isbn, IHttpClientFactory factory, CancellationToken ct) =>
        {
            isbn = isbn.Replace("-", "").Replace(" ", "").ToUpperInvariant();
            if (!IsbnRegex().IsMatch(isbn))
                return Results.BadRequest(new { message = "Invalid ISBN." });

            var client = factory.CreateClient(HttpClientName);
            using var response = await client.GetAsync(
                $"api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data", ct);
            if (!response.IsSuccessStatusCode)
                return Results.Problem("ISBN lookup failed.", statusCode: StatusCodes.Status502BadGateway);

            await using var stream = await response.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);
            if (!doc.RootElement.TryGetProperty($"ISBN:{isbn}", out var data))
                return Results.NotFound(new { message = "No book found for that ISBN." });

            return Results.Ok(Parse(isbn, data));
        }).WithTags("Lookup");

        return api;
    }

    public static IsbnLookupResponse Parse(string isbn, JsonElement data)
    {
        static string? Str(JsonElement e, string name) =>
            e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

        static string? Names(JsonElement e, string name) =>
            e.TryGetProperty(name, out var arr) && arr.ValueKind == JsonValueKind.Array
                ? string.Join(", ", arr.EnumerateArray().Select(a => Str(a, "name")).Where(n => !string.IsNullOrEmpty(n)))
                : null;

        int? year = null;
        var publishDate = Str(data, "publish_date");
        if (publishDate is not null && YearRegex().Match(publishDate) is { Success: true } m)
            year = int.Parse(m.Groups[1].Value);

        int? pages = data.TryGetProperty("number_of_pages", out var p) && p.TryGetInt32(out var n) ? n : null;

        string? cover = null;
        if (data.TryGetProperty("cover", out var c))
            cover = Str(c, "large") ?? Str(c, "medium");

        var title = Str(data, "title");
        var subtitle = Str(data, "subtitle");
        if (title is not null && subtitle is not null) title = $"{title}: {subtitle}";

        string? description = null;
        if (data.TryGetProperty("excerpts", out var ex) && ex.ValueKind == JsonValueKind.Array && ex.GetArrayLength() > 0)
            description = Str(ex[0], "text");

        return new IsbnLookupResponse(isbn, title, Names(data, "authors"), Names(data, "publishers"),
            year, pages, cover?.Replace("http://", "https://"), description);
    }
}
