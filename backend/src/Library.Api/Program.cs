using System.Threading.RateLimiting;
using Library.Api.Auth;
using Library.Api.Data;
using Library.Api.Endpoints;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("Library")
    ?? throw new InvalidOperationException("Connection string 'Library' is not configured.");

builder.Services.AddDbContext<LibraryDbContext>(o => o.UseNpgsql(connectionString,
    npgsql => npgsql.EnableRetryOnFailure(5)));

// Persist data-protection keys in the database so auth cookies survive
// container restarts / scale-to-zero and work across instances.
builder.Services.AddDataProtection()
    .SetApplicationName("Library")
    .PersistKeysToDbContext<LibraryDbContext>();

builder.Services
    .AddIdentity<AppUser, IdentityRole>(o =>
    {
        o.User.RequireUniqueEmail = true;
        o.Password.RequiredLength = 8;
        o.Password.RequireNonAlphanumeric = false;
        o.Password.RequireUppercase = false;
        o.Lockout.MaxFailedAccessAttempts = 5;
        o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
    })
    .AddEntityFrameworkStores<LibraryDbContext>()
    .AddDefaultTokenProviders();

builder.Services.ConfigureApplicationCookie(o =>
{
    o.Cookie.Name = "library.auth";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = builder.Environment.IsProduction()
        ? CookieSecurePolicy.Always
        : CookieSecurePolicy.SameAsRequest;
    o.ExpireTimeSpan = TimeSpan.FromDays(30);
    o.SlidingExpiration = true;
    // This is a JSON API: return status codes instead of redirecting to a login page.
    o.Events.OnRedirectToLogin = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status401Unauthorized;
        return Task.CompletedTask;
    };
    o.Events.OnRedirectToAccessDenied = ctx =>
    {
        ctx.Response.StatusCode = StatusCodes.Status403Forbidden;
        return Task.CompletedTask;
    };
});

builder.Services.AddAuthorization();
builder.Services.AddValidation();
builder.Services.AddProblemDetails();

var loginPermitsPerMinute = builder.Configuration.GetValue("RateLimiting:LoginPerMinute", 10);
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddPolicy("login", ctx => RateLimitPartition.GetFixedWindowLimiter(
        ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = loginPermitsPerMinute, Window = TimeSpan.FromMinutes(1) }));
});

builder.Services.AddHttpClient(LookupEndpoints.HttpClientName, c =>
{
    c.BaseAddress = new Uri("https://openlibrary.org/");
    c.Timeout = TimeSpan.FromSeconds(10);
    c.DefaultRequestHeaders.UserAgent.ParseAdd("HomeLibrary/1.0");
});

// Scaleway Serverless Containers terminate TLS in front of the app.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownIPNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();

app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Lightweight health check that does not touch the database, so the
// serverless database can stay asleep while the container is idle.
app.MapGet("/healthz", () => Results.Ok(new { status = "ok" })).AllowAnonymous();

var api = app.MapGroup("/api").RequireAuthorization();
api.MapAuthEndpoints();
api.MapUsersEndpoints();
api.MapBooksEndpoints();
api.MapReviewsEndpoints();
api.MapLookupEndpoints();

// Unknown API routes are 404s; everything else is the React SPA.
app.MapFallback("/api/{**rest}", () => Results.NotFound());
app.MapFallbackToFile("index.html");

await SeedData.InitializeAsync(app.Services);

app.Run();

public partial class Program;
