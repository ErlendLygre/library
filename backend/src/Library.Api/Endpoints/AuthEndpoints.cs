using System.Security.Claims;
using Library.Api.Auth;
using Library.Api.Data;
using Microsoft.AspNetCore.Identity;

namespace Library.Api.Endpoints;

public static class AuthEndpoints
{
    public static RouteGroupBuilder MapAuthEndpoints(this RouteGroupBuilder api)
    {
        var group = api.MapGroup("/auth").WithTags("Auth");

        group.MapPost("/login", async (LoginRequest req, SignInManager<AppUser> signIn, UserManager<AppUser> users) =>
        {
            var user = await users.FindByEmailAsync(req.Email);
            if (user is null)
                return Results.Problem("Invalid email or password.", statusCode: StatusCodes.Status401Unauthorized);

            var result = await signIn.PasswordSignInAsync(user, req.Password, isPersistent: true, lockoutOnFailure: true);
            if (result.IsLockedOut)
                return Results.Problem("Account temporarily locked. Try again later.", statusCode: StatusCodes.Status423Locked);
            if (!result.Succeeded)
                return Results.Problem("Invalid email or password.", statusCode: StatusCodes.Status401Unauthorized);

            return Results.Ok(await ToMe(user, users));
        }).AllowAnonymous().RequireRateLimiting("login");

        group.MapPost("/logout", async (SignInManager<AppUser> signIn) =>
        {
            await signIn.SignOutAsync();
            return Results.NoContent();
        }).AllowAnonymous();

        group.MapGet("/me", async (ClaimsPrincipal principal, UserManager<AppUser> users) =>
        {
            var user = await users.GetUserAsync(principal);
            return user is null ? Results.Unauthorized() : Results.Ok(await ToMe(user, users));
        });

        group.MapPost("/change-password", async (
            ChangePasswordRequest req, ClaimsPrincipal principal,
            UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            var user = await users.GetUserAsync(principal);
            if (user is null) return Results.Unauthorized();

            var result = await users.ChangePasswordAsync(user, req.CurrentPassword, req.NewPassword);
            if (!result.Succeeded)
                return Results.ValidationProblem(result.Errors.ToDictionary(e => e.Code, e => new[] { e.Description }));

            await signIn.RefreshSignInAsync(user);
            return Results.NoContent();
        });

        return api;
    }

    private static async Task<MeResponse> ToMe(AppUser user, UserManager<AppUser> users) =>
        new(user.Id, user.Email!, user.DisplayName, await users.IsInRoleAsync(user, Roles.Admin));
}
