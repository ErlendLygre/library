using System.Text.Json;
using Library.Api.Endpoints;

namespace Library.Api.Tests;

public class LookupParseTests
{
    [Fact]
    public void Parses_open_library_response()
    {
        const string json = """
        {
          "title": "Dune",
          "authors": [{ "name": "Frank Herbert" }],
          "publishers": [{ "name": "Ace" }, { "name": "Penguin" }],
          "publish_date": "August 2, 2005",
          "number_of_pages": 528,
          "cover": { "medium": "http://covers.openlibrary.org/b/id/1-M.jpg", "large": "http://covers.openlibrary.org/b/id/1-L.jpg" }
        }
        """;
        using var doc = JsonDocument.Parse(json);
        var result = LookupEndpoints.Parse("9780441013593", doc.RootElement);

        Assert.Equal("Dune", result.Title);
        Assert.Equal("Frank Herbert", result.Authors);
        Assert.Equal("Ace, Penguin", result.Publisher);
        Assert.Equal(2005, result.PublishedYear);
        Assert.Equal(528, result.PageCount);
        Assert.Equal("https://covers.openlibrary.org/b/id/1-L.jpg", result.CoverUrl);
    }
}
