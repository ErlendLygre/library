using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Library.Api.Data;

public class LibraryDbContext(DbContextOptions<LibraryDbContext> options)
    : IdentityDbContext<AppUser>(options), IDataProtectionKeyContext
{
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<AppUser>(u =>
        {
            u.Property(x => x.DisplayName).HasMaxLength(100);
        });

        builder.Entity<Book>(b =>
        {
            b.Property(x => x.Title).HasMaxLength(500).IsRequired();
            b.Property(x => x.Authors).HasMaxLength(500);
            b.Property(x => x.Isbn).HasMaxLength(20);
            b.Property(x => x.Publisher).HasMaxLength(200);
            b.Property(x => x.Description).HasMaxLength(10_000);
            b.Property(x => x.CoverUrl).HasMaxLength(1000);
            b.Property(x => x.Location).HasMaxLength(200);
            b.HasIndex(x => x.Isbn);
            b.HasIndex(x => x.Title);
            b.HasOne(x => x.AddedBy).WithMany()
                .HasForeignKey(x => x.AddedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Review>(r =>
        {
            r.Property(x => x.Text).HasMaxLength(20_000);
            r.HasIndex(x => new { x.BookId, x.UserId }).IsUnique();
            r.ToTable(t => t.HasCheckConstraint("CK_Reviews_Rating", "\"Rating\" BETWEEN 1 AND 5"));
            r.HasOne(x => x.Book).WithMany(x => x.Reviews)
                .HasForeignKey(x => x.BookId)
                .OnDelete(DeleteBehavior.Cascade);
            r.HasOne(x => x.User).WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
